import datetime
from fastapi import APIRouter, Query
from typing import Optional, List, Dict
import mlflow
from mlflow.tracking import MlflowClient
from app.core.config import settings

router = APIRouter()

AGENT_METADATA = {
    "nl2sql": {
        "name": "NL2SQL Database Agent",
        "model": "llama-3.1-8b-instant",
        "description": "Translates natural language questions into read-only PostgreSQL queries."
    },
    "rag": {
        "name": "RAG SOP Search Agent",
        "model": "llama-3.1-8b-instant + ChromaDB",
        "description": "Performs semantic vector search across SOP documents to answer policy questions."
    },
    "slotting": {
        "name": "Slotting Optimization Agent",
        "model": "Pareto ABC + Groq Summarizer",
        "description": "Analyzes order velocity and Pareto distribution to flag misallocated SKUs."
    },
    "pick_path": {
        "name": "Pick Path TSP Agent",
        "model": "NetworkX + Google OR-Tools TSP",
        "description": "Solves Traveling Salesperson Problem over 2D warehouse spatial graph."
    }
}

def get_client():
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    return MlflowClient()

@router.get("/mlflow/performance")
def get_mlflow_performance():
    """
    Returns aggregated Gen AI performance telemetry for all agents tracked in MLflow.
    """
    try:
        client = get_client()
        experiment = client.get_experiment_by_name("warehouse_agents")
        
        if not experiment:
            return {
                "total_runs": 0,
                "overall_avg_response_time": 0.0,
                "experiment_name": "warehouse_agents",
                "mlflow_ui_url": "http://localhost:5000",
                "agents": {}
            }

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=1000
        )

        agent_stats = {
            k: {
                "agent_id": k,
                "name": meta["name"],
                "model": meta["model"],
                "description": meta["description"],
                "total_runs": 0,
                "response_times": [],
                "avg_response_time": 0.0,
                "min_response_time": 0.0,
                "max_response_time": 0.0,
                "status_counts": {"SUCCESS": 0, "ERROR": 0}
            } for k, meta in AGENT_METADATA.items()
        }

        all_response_times = []

        for run in runs:
            agent = run.data.tags.get("agent") or run.data.tags.get("agent_name") or "unknown"
            
            # Match agent string
            agent_key = None
            if "sql" in agent.lower():
                agent_key = "nl2sql"
            elif "rag" in agent.lower() or "sop" in agent.lower():
                agent_key = "rag"
            elif "slot" in agent.lower():
                agent_key = "slotting"
            elif "pick" in agent.lower() or "tsp" in agent.lower():
                agent_key = "pick_path"

            resp_time = run.data.metrics.get("response_time") or run.data.metrics.get("response_time_seconds") or 0.0
            
            if resp_time > 0:
                all_response_times.append(resp_time)

            if agent_key and agent_key in agent_stats:
                stat = agent_stats[agent_key]
                stat["total_runs"] += 1
                if resp_time > 0:
                    stat["response_times"].append(resp_time)
                
                status = run.data.tags.get("status", "SUCCESS")
                stat["status_counts"][status] = stat["status_counts"].get(status, 0) + 1

        # Calculate averages & min/max
        for key, stat in agent_stats.items():
            r_times = stat["response_times"]
            if r_times:
                stat["avg_response_time"] = round(sum(r_times) / len(r_times), 3)
                stat["min_response_time"] = round(min(r_times), 3)
                stat["max_response_time"] = round(max(r_times), 3)
            else:
                stat["avg_response_time"] = 0.0
            del stat["response_times"]

        overall_avg = round(sum(all_response_times) / len(all_response_times), 3) if all_response_times else 0.0

        return {
            "total_runs": len(runs),
            "overall_avg_response_time": overall_avg,
            "experiment_name": "warehouse_agents",
            "mlflow_ui_url": "http://localhost:5000",
            "agents": agent_stats
        }

    except Exception as e:
        return {
            "error": f"Failed to retrieve MLflow metrics: {str(e)}",
            "total_runs": 0,
            "overall_avg_response_time": 0.0,
            "agents": {}
        }

@router.get("/mlflow/runs")
def get_mlflow_runs(
    agent: Optional[str] = Query(None, description="Filter runs by agent type"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns list of recent MLflow run logs for table visualization.
    """
    try:
        client = get_client()
        experiment = client.get_experiment_by_name("warehouse_agents")
        if not experiment:
            return []

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=limit * 2
        )

        output_runs = []
        for run in runs:
            agent_tag = run.data.tags.get("agent") or run.data.tags.get("agent_name") or "unknown"
            
            agent_key = "unknown"
            if "sql" in agent_tag.lower():
                agent_key = "nl2sql"
            elif "rag" in agent_tag.lower() or "sop" in agent_tag.lower():
                agent_key = "rag"
            elif "slot" in agent_tag.lower():
                agent_key = "slotting"
            elif "pick" in agent_tag.lower() or "tsp" in agent_tag.lower():
                agent_key = "pick_path"

            if agent and agent != "all" and agent_key != agent:
                continue

            query_param = (
                run.data.params.get("query") or
                run.data.params.get("question") or
                run.data.params.get("input_query") or
                run.data.params.get("order_id") or
                "Operational Request"
            )

            resp_time = run.data.metrics.get("response_time") or run.data.metrics.get("response_time_seconds") or 0.0
            
            # Format timestamp
            start_ms = run.info.start_time
            start_dt = datetime.datetime.fromtimestamp(start_ms / 1000.0) if start_ms else datetime.datetime.now()
            time_str = start_dt.strftime("%Y-%m-%d %H:%M:%S")

            output_runs.append({
                "run_id": run.info.run_id,
                "run_name": run.data.tags.get("mlflow.runName", run.info.run_id[:8]),
                "agent": agent_key,
                "agent_display": AGENT_METADATA.get(agent_key, {}).get("name", agent_tag),
                "model": run.data.tags.get("model", AGENT_METADATA.get(agent_key, {}).get("model", "Default LLM")),
                "query": query_param,
                "response_time": round(resp_time, 3),
                "status": run.data.tags.get("status", "SUCCESS"),
                "timestamp": time_str
            })

            if len(output_runs) >= limit:
                break

        return output_runs

    except Exception as e:
        return [{"error": str(e)}]
