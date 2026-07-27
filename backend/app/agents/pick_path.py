import time
import mlflow
import networkx as nx
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from sqlalchemy import text
from app.core.database import engine


def build_warehouse_graph() -> nx.Graph:
    """
    Builds a NetworkX graph from warehouse_nodes and warehouse_paths.
    
    Think of it as a map:
    Nodes = physical locations (bins, PACK, RECEIVE)
    Edges = walkable connections between locations
    Weight = distance in meters
    
    Returns:
        nx.Graph: the complete warehouse map as a graph
    """
    graph = nx.Graph()

    with engine.connect() as conn:
        # Add every warehouse location as a node with x,y coordinates
        nodes_result = conn.execute(text(
            "SELECT node_id, x, y FROM warehouse_nodes"
        ))
        for row in nodes_result:
            graph.add_node(row[0], x=row[1], y=row[2])

        # Add every path as an edge with distance as weight
        paths_result = conn.execute(text(
            "SELECT from_node, to_node, distance FROM warehouse_paths"
        ))
        for row in paths_result:
            # undirected graph — can walk both directions
            graph.add_edge(row[0], row[1], weight=row[2])

    return graph


def get_order_bins(order_id: str) -> list:
    """
    Finds the physical bin location of every SKU in a given order.
    
    Joins three tables:
    order_items → which SKUs are in this order
    inventory   → which node_id each SKU is stored at
    warehouse_nodes → coordinates of that node
    
    Args:
        order_id: the order ID to look up (e.g. "ORD001929")
    
    Returns:
        list of dicts with sku_id, node_id, quantity, x, y, zone
    """
    query = text("""
        SELECT
            oi.sku_id,
            oi.quantity,
            i.node_id,
            n.x,
            n.y,
            n.zone
        FROM order_items oi
        JOIN inventory i ON oi.sku_id = i.sku_id
        JOIN warehouse_nodes n ON i.node_id = n.node_id
        WHERE oi.order_id = :order_id
    """)

    with engine.connect() as conn:
        result = conn.execute(query, {"order_id": order_id})
        bins = []
        for row in result:
            bins.append({
                "sku_id":   row[0],
                "quantity": row[1],
                "node_id":  row[2],
                "x":        row[3],
                "y":        row[4],
                "zone":     row[5]
            })

    return bins


def build_distance_matrix(graph: nx.Graph, node_list: list) -> list:
    """
    Creates a 2D distance matrix between every pair of nodes.
    
    Strategy:
    1. First try NetworkX shortest path through actual warehouse aisles
    2. If no path exists (sparse graph), fall back to Euclidean distance
       using x,y coordinates stored on each node
       
    Euclidean distance = straight line distance between two points
    Formula: sqrt((x2-x1)^2 + (y2-y1)^2)
    This is a valid approximation for warehouse grid layouts.
    
    OR-Tools needs integers, so multiply distances by 10 and round.
    
    Args:
        graph: warehouse NetworkX graph with x,y node attributes
        node_list: list of node IDs to build matrix for
    
    Returns:
        2D list of integer distances
    """
    n = len(node_list)
    matrix = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                matrix[i][j] = 0
                continue

            try:
                # Try actual graph path first (uses real aisle distances)
                dist = nx.shortest_path_length(
                    graph,
                    source=node_list[i],
                    target=node_list[j],
                    weight='weight'
                )
                matrix[i][j] = int(round(dist * 10))
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                # Fall back to Euclidean distance
                node_i = graph.nodes[node_list[i]]
                node_j = graph.nodes[node_list[j]]
                dist = math.sqrt((node_i['x'] - node_j['x'])**2 + (node_i['y'] - node_j['y'])**2)
                matrix[i][j] = int(round(dist * 10))

    return matrix


def solve_tsp(distance_matrix: list) -> list:
    """
    Uses Google OR-Tools to solve the Travelling Salesman Problem.
    
    Finds the shortest sequence to visit all bins starting
    from RECEIVE (index 0) and ending at PACK (last index).
    
    OR-Tools is a production-grade optimization library by Google.
    PATH_CHEAPEST_ARC strategy: always pick the nearest next node.
    
    Args:
        distance_matrix: 2D list of integer distances
    
    Returns:
        list of node indices in optimal visit order
    """
    n = len(distance_matrix)

    # start_idx = 0 (RECEIVE is always first in our node_list)
    # end_idx = n-1 (PACK is always last in our node_list)
    start_idx = 0
    end_idx   = n - 1

    # Create routing manager — tells OR-Tools about nodes, vehicles, start/end
    manager = pywrapcp.RoutingIndexManager(
        n,          # total number of locations
        1,          # number of vehicles (1 picker)
        [start_idx],  # start location index
        [end_idx]     # end location index
    )

    # Create the routing model
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        """Returns distance between two locations."""
        from_node = manager.IndexToNode(from_index)
        to_node   = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    # Register the distance function with OR-Tools
    transit_idx = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    # Set search strategy — PATH_CHEAPEST_ARC is fast and effective
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # Solve the problem
    solution = routing.SolveWithParameters(search_params)

    if not solution:
        # If no optimal solution found, return sequential order as fallback
        return list(range(n))

    # Extract the route from the solution
    route_indices = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route_indices.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    # Add the end node (PACK)
    route_indices.append(manager.IndexToNode(index))

    return route_indices


def run_pick_path(order_id: str) -> dict:
    mlflow.set_experiment('warehouse_agents')
    with mlflow.start_run():
        start_time = time.time()
        mlflow.set_tag('agent', 'pick_path')
        mlflow.log_param('query', order_id)

        """
        Main function — finds the optimal picking route for any order.
    
        Complete flow:
        1. Build warehouse graph (NetworkX)
        2. Get bin locations for all items in this order
        3. Build visit node list: [RECEIVE, bin1, bin2, ..., PACK]
        4. Build distance matrix between all visit nodes
        5. OR-Tools TSP solver finds optimal sequence
        6. Calculate distance saved vs sequential (baseline) order
        7. Build step-by-step pick instructions
    
        Args:
            order_id: the order to optimize (e.g. "ORD001929")
    
        Returns:
            dict with route, distances, savings percentage, and step instructions
        """
        # Step 1: Build the warehouse map as a graph
        graph = build_warehouse_graph()

        # Step 2: Get bin locations for every item in this order
        bin_locations = get_order_bins(order_id)

        if not bin_locations:
            return {"error": f"Order {order_id} not found or has no items"}

        # Step 3: Build the visit list
        # Always start at RECEIVE, always end at PACK
        # Deduplicate bins (same bin might have multiple SKUs)
        seen_nodes = set()
        unique_bins = []
        for loc in bin_locations:
            if loc["node_id"] not in seen_nodes:
                seen_nodes.add(loc["node_id"])
                unique_bins.append(loc)

        # Final visit order: RECEIVE → all bins → PACK
        visit_nodes = ["RECEIVE"] + [b["node_id"] for b in unique_bins] + ["PACK"]

        # Step 4: Build distance matrix between all visit nodes
        distance_matrix = build_distance_matrix(graph, visit_nodes)

        # Step 5: Solve TSP — find optimal bin visit sequence
        optimal_indices = solve_tsp(distance_matrix)

        # Convert indices back to node names
        optimal_route = [visit_nodes[i] for i in optimal_indices]

        # Step 6: Calculate optimized total distance (convert back from x10)
        optimized_distance = 0
        for i in range(len(optimal_indices) - 1):
            optimized_distance += distance_matrix[optimal_indices[i]][optimal_indices[i+1]]
        optimized_distance = round(optimized_distance / 10, 2)

        # Calculate baseline distance (sequential order: 0→1→2→...→n)
        baseline_distance = 0
        for i in range(len(visit_nodes) - 1):
            baseline_distance += distance_matrix[i][i + 1]
        baseline_distance = round(baseline_distance / 10, 2)

        # Calculate percentage saved
        if baseline_distance > 0:
            saved_pct = round(
                (1 - optimized_distance / baseline_distance) * 100, 1
            )
        else:
            saved_pct = 0.0

        # Step 7: Build step-by-step pick instructions
        steps = []
        for step_num, node_id in enumerate(optimal_route, start=1):
            # Find if this node has a SKU to pick
            sku_at_node = next(
                (loc for loc in bin_locations if loc["node_id"] == node_id),
                None
            )

            if node_id == "RECEIVE":
                action = "Start at Receiving dock — begin picking"
            elif node_id == "PACK":
                action = "End at Packing station — pack and dispatch order"
            elif sku_at_node:
                action = (f"Pick {sku_at_node['quantity']} unit(s) "
                          f"of {sku_at_node['sku_id']}")
            else:
                action = "Pass through"

            steps.append({
                "step":    step_num,
                "node_id": node_id,
                "action":  action
            })

        elapsed = time.time() - start_time
        mlflow.log_metric('response_time', elapsed)
        return {
            "order_id":            order_id,
            "total_items":         len(bin_locations),
            "total_unique_bins":   len(unique_bins),
            "optimal_route":       optimal_route,
            "optimized_distance_m": optimized_distance,
            "baseline_distance_m":  baseline_distance,
            "distance_saved_pct":  saved_pct,
            "pick_steps":          steps,
            "items_in_order":      bin_locations
        }
