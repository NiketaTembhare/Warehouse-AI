import urllib.request
import urllib.error
import json
import time

def test_endpoint(name, url, method="GET", data=None):
    print(f"\n--- Testing {name} ---")
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header('Content-Type', 'application/json')
            req.data = json.dumps(data).encode('utf-8')
            
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status: {status}")
            
            try:
                parsed = json.loads(body)
                if "optimal_route" in parsed:
                    print(f"Route: {parsed['optimal_route']}")
                elif "intent" in parsed:
                    print(f"Intent: {parsed['intent']}")
                    print(f"Response snippet: {str(parsed['response'])[:150]}...")
                elif "total_mismatches" in parsed:
                    print(f"Mismatches: {parsed['total_mismatches']}")
                    print(f"Analyzed: {parsed['total_skus_analyzed']}")
                else:
                    print(f"Response: {body[:100]}...")
            except json.JSONDecodeError:
                print("Response starts with:", body[:50].replace('\n', ' '))
                
            return True
    except Exception as e:
        print(f"Error: {e}")
        return False

print("Waiting for servers to fully boot...")
time.sleep(5)

# 1. Frontend & Backend Health
test_endpoint("Frontend (Dashboard)", "http://localhost:5173/")
test_endpoint("Backend Health", "http://localhost:8000/health")

# 2. Chat RAG
test_endpoint("Chat RAG", "http://localhost:8000/api/chat", method="POST", data={"query": "How should heavy items be stored?"})

# 3. Chat NL2SQL
test_endpoint("Chat NL2SQL", "http://localhost:8000/api/chat", method="POST", data={"query": "Which SKUs are ordered most?"})

# 4. Slotting
test_endpoint("Slotting", "http://localhost:8000/api/slotting")

# 5. PickPath
test_endpoint("PickPath", "http://localhost:8000/api/pickpath", method="POST", data={"order_id": "ORD001929"})
