import sys
import os

# Ensure we can import app modules properly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.router import router_app
import mlflow

queries = [
    "How should heavy items be stored?",
    "Which SKUs are ordered most this week?",
    "Run slotting optimization",
    "Get pick path for order ORD001929"
]

print("=== Testing LangGraph Router & MLflow ===\n")
for q in queries:
    print(f"User Query: {q}")
    try:
        result = router_app.invoke({"query": q})
        print(f"--> Intent classified as: {result.get('intent')}")
        
        response = result.get('response')
        if isinstance(response, dict) and "error" in response:
            print(f"--> Error: {response['error']}")
        else:
            print(f"--> Success! Response type: {type(response)}")
            print(f"--> Response snippet: {str(response)[:150]}...\n")
    except Exception as e:
        print(f"--> Exception occurred: {e}\n")

print("=== Checking MLflow ===")
client = mlflow.tracking.MlflowClient()
experiment = client.get_experiment_by_name("warehouse_agents")
if experiment:
    runs = client.search_runs(experiment_ids=[experiment.experiment_id])
    print(f"Found {len(runs)} total runs in MLflow for 'warehouse_agents'")
    
    # Print the last 4 runs to verify our test
    for run in runs[:4]:
        agent_name = run.data.tags.get('agent_name')
        query = run.data.params.get('question') or run.data.params.get('input_query') or run.data.params.get('order_id') or 'N/A'
        resp_time = run.data.metrics.get('response_time_seconds', 0)
        print(f" - Agent: {agent_name:10} | Time: {resp_time:.2f}s | Input: {query[:30]}")
else:
    print("Experiment 'warehouse_agents' not found in MLflow. This means logging didn't happen.")
