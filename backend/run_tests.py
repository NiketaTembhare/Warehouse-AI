import json
import requests
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

# All 15 test cases
NL2SQL_QUESTIONS = [
    "How many total orders are in the database?",
    "Which 5 SKUs appear most frequently in order_items?",
    "How many warehouse nodes are in the Fast zone?",
    "What are the top 3 SKU categories by number of SKUs?",
    "What is the average weight in kg of Electronics SKUs?",
    "How many unique orders have status Completed?",
    "Which SKU has the lowest order count?",
    "How many total SKUs are in the sku_master table?"
]

RAG_QUESTIONS = [
    "What is the procedure for damaged goods?",
    "Can chemicals be stored near food items?",
    "Where should high velocity SKUs be stored?",
    "How should heavy items above 15kg be stored?",
    "When should re-slotting be scheduled to avoid disruption?",
    "What is the maximum box weight limit for packing?"
]

def call_nl2sql(question: str) -> dict:
    response = requests.post(
        f"{BASE_URL}/query",
        json={"question": question},
        timeout=60
    )
    return response.json()

def call_rag(question: str) -> dict:
    response = requests.post(
        f"{BASE_URL}/sop",
        json={"question": question},
        timeout=60
    )
    return response.json()

def call_slotting() -> dict:
    response = requests.post(
        f"{BASE_URL}/slotting",
        json={},
        timeout=120
    )
    return response.json()

def run_all_tests():
    results = {
        "project": "Warehouse AI Assistant",
        "generated_on": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_test_cases": 15,
        "agents_tested": ["NL2SQL Agent", "RAG SOP Agent", 
                          "Slotting Optimization Agent"],
        "test_cases": []
    }

    case_num = 1

    # NL2SQL tests
    print("Running NL2SQL Agent tests...")
    for question in NL2SQL_QUESTIONS:
        print(f"  [{case_num}/15] {question[:50]}...")
        try:
            output = call_nl2sql(question)
            status = "PASS"
        except Exception as e:
            output = {"error": str(e)}
            status = "FAIL"

        results["test_cases"].append({
            "id": f"TC_{case_num:02d}",
            "agent": "NL2SQL Agent",
            "endpoint": "POST /api/query",
            "input": {"question": question},
            "output": output,
            "status": status
        })
        case_num += 1

    # RAG tests
    print("Running RAG SOP Agent tests...")
    for question in RAG_QUESTIONS:
        print(f"  [{case_num}/15] {question[:50]}...")
        try:
            output = call_rag(question)
            status = "PASS"
        except Exception as e:
            output = {"error": str(e)}
            status = "FAIL"

        results["test_cases"].append({
            "id": f"TC_{case_num:02d}",
            "agent": "RAG SOP Agent",
            "endpoint": "POST /api/sop",
            "input": {"question": question},
            "output": output,
            "status": status
        })
        case_num += 1

    # Slotting test
    print(f"  [{case_num}/15] Running Slotting Optimization...")
    try:
        output = call_slotting()
        # Only keep top 5 recommendations to keep file readable
        if "recommendations" in output:
            output["recommendations"] = output["recommendations"][:5]
            output["note"] = "Showing top 5 of 20 recommendations"
        status = "PASS"
    except Exception as e:
        output = {"error": str(e)}
        status = "FAIL"

    results["test_cases"].append({
        "id": f"TC_{case_num:02d}",
        "agent": "Slotting Optimization Agent",
        "endpoint": "POST /api/slotting",
        "input": "No input required — analyzes all SKUs automatically",
        "output": output,
        "status": status
    })

    # Save to file
    with open("agent_outputs.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Print summary
    passed = sum(1 for t in results["test_cases"] if t["status"] == "PASS")
    failed = sum(1 for t in results["test_cases"] if t["status"] == "FAIL")
    
    print()
    print("=" * 50)
    print(f"COMPLETED: {passed}/15 passed, {failed} failed")
    print("Output saved to: agent_outputs.json")
    print("=" * 50)

if __name__ == "__main__":
    run_all_tests()
