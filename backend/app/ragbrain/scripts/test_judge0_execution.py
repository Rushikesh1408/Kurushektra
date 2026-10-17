import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:2358"

def submit_code(source_code, language_id=71, stdin="", cpu_time_limit=5.0):
    url = f"{BASE_URL}/submissions?base64_encoded=false&wait=true"
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin,
        "cpu_time_limit": cpu_time_limit
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise

print("=== TEST 1: Valid Python Program: print(2 + 3) ===")
res1 = submit_code("print(2 + 3)")
print("Response:")
print(json.dumps(res1, indent=2))
stdout = res1.get("stdout")
status = res1.get("status", {})
print(f"Status: {status.get('description')} (id: {status.get('id')})")
print(f"Output: {repr(stdout)}")
assert stdout.strip() == "5", f"Expected '5', got {repr(stdout)}"
assert status.get("id") == 3, f"Expected status id 3 (Accepted), got {status}"
print(">>> TEST 1 PASSED: Valid code executed and produced 5! <<<\n")

print("=== TEST 2: Runtime Error ===")
res2 = submit_code("print(1 / 0)")
print("Response:")
print(json.dumps(res2, indent=2))
stderr = res2.get("stderr")
status2 = res2.get("status", {})
print(f"Status: {status2.get('description')} (id: {status2.get('id')})")
print(f"Stderr: {repr(stderr)}")
assert "ZeroDivisionError" in (stderr or "") or status2.get("id") != 3
print(">>> TEST 2 PASSED: Runtime error surfaced correctly! <<<\n")

print("=== TEST 3: Time Limit Exceeded ===")
res3 = submit_code("import time\nwhile True:\n    time.sleep(0.1)", cpu_time_limit=1.0)
print("Response:")
print(json.dumps(res3, indent=2))
status3 = res3.get("status", {})
print(f"Status: {status3.get('description')} (id: {status3.get('id')})")
print(">>> TEST 3 COMPLETED: Execution limits tested! <<<\n")
