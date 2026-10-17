import requests
import time
import json
import sys

BASE_URL = "http://localhost:2358"

def submit_and_poll(source_code, language_id=71, cpu_time_limit=5.0, stdin=""):
    create_url = f"{BASE_URL}/submissions?base64_encoded=false&wait=false"
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "cpu_time_limit": cpu_time_limit,
        "stdin": stdin
    }
    
    res = requests.post(create_url, json=payload)
    if res.status_code != 201:
        raise RuntimeError(f"Failed to submit: {res.status_code} {res.text}")
    
    token = res.json()["token"]
    print(f"Submission created with token: {token}")
    
    # Poll until terminal status
    get_url = f"{BASE_URL}/submissions/{token}?base64_encoded=false"
    for _ in range(30):
        time.sleep(0.5)
        poll_res = requests.get(get_url)
        data = poll_res.json()
        status_id = data.get("status", {}).get("id")
        # 1: In Queue, 2: Processing
        if status_id not in (1, 2):
            return data
    
    raise TimeoutError("Submission timed out in polling")

def run_tests():
    print("=== TEST 1: Valid Execution print(2 + 3) ===")
    res1 = submit_and_poll("print(2 + 3)")
    print(json.dumps(res1, indent=2))
    assert res1["status"]["id"] == 3, f"Expected status 3 (Accepted), got {res1['status']}"
    assert res1["stdout"] == "5\n", f"Expected stdout '5\\n', got {repr(res1['stdout'])}"
    print(">>> TEST 1 PASS: Accepted with stdout '5\\n'")

    print("\n=== TEST 2: Runtime Error print(1 / 0) ===")
    res2 = submit_and_poll("print(1 / 0)")
    print(json.dumps(res2, indent=2))
    assert "ZeroDivisionError" in (res2.get("stderr") or ""), f"Expected ZeroDivisionError in stderr, got {res2.get('stderr')}"
    print(f">>> TEST 2 PASS: Status {res2['status']['description']}, stderr captured ZeroDivisionError")

    print("\n=== TEST 3: Syntax Error def bad_syntax( ===")
    res3 = submit_and_poll("def bad_syntax(")
    print(json.dumps(res3, indent=2))
    assert "SyntaxError" in (res3.get("stderr") or "") or "SyntaxError" in (res3.get("compile_output") or ""), "Expected SyntaxError"
    print(f">>> TEST 3 PASS: Status {res3['status']['description']}, SyntaxError correctly captured")

    print("\n=== TEST 4: Time Limit Exceeded ===")
    res4 = submit_and_poll("import time\nwhile True:\n    pass", cpu_time_limit=1.0)
    print(json.dumps(res4, indent=2))
    assert res4["status"]["id"] == 5, f"Expected status 5 (Time Limit Exceeded), got {res4['status']}"
    print(f">>> TEST 4 PASS: Status {res4['status']['description']}")

if __name__ == "__main__":
    run_tests()
