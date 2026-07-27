from app.agents.pick_path import (
    build_warehouse_graph,
    get_order_bins,
    build_distance_matrix,
    solve_tsp,
    run_pick_path
)

print('Step 1: Building warehouse graph...')
graph = build_warehouse_graph()
print(f'Nodes in graph: {graph.number_of_nodes()}')
print(f'Edges in graph: {graph.number_of_edges()}')

print()
print('Step 2: Getting bins for order ORD001929...')
bins = get_order_bins('ORD001929')
print(f'Items in order: {len(bins)}')
for b in bins:
    print(f'  {b["sku_id"]} → {b["node_id"]} ({b["zone"]})')

print()
print('Step 3: Running full optimization...')
result = run_pick_path('ORD001929')
print(f'Optimal route: {result["optimal_route"]}')
print(f'Optimized distance: {result["optimized_distance_m"]} meters')
print(f'Baseline distance:  {result["baseline_distance_m"]} meters')
print(f'Distance saved:     {result["distance_saved_pct"]}%')
print()
print('Pick steps:')
for step in result['pick_steps']:
    print(f'  Step {step["step"]}: {step["node_id"]} → {step["action"]}')
