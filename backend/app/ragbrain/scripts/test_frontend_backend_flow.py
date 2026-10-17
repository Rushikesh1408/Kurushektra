import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_flow():
    print("=== Step 1: Health Check ===")
    res = requests.get(f"{BASE_URL}/health")
    print(f"Health response: {res.status_code} {res.json()}")
    assert res.status_code == 200

    print("\n=== Step 2: Login as Student ===")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "student@demo.local", "password": "password123"}
    )
    print(f"Login status: {login_res.status_code}")
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Authentication successful, JWT acquired.")

    print("\n=== Step 3: Submit Valid Python Code for Two Sum ===")
    valid_code = """def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

import json, sys
if __name__ == '__main__':
    data = json.loads(sys.stdin.read().strip())
    print(json.dumps(two_sum(data['nums'], data['target'])))
"""
    sub_res = requests.post(
        f"{BASE_URL}/submissions",
        headers=headers,
        json={
            "assignment_id": "assign-two-sum-01",
            "language": "python",
            "source_code": valid_code
        }
    )
    print(f"Submission status code: {sub_res.status_code}")
    assert sub_res.status_code == 201, f"Failed submission: {sub_res.text}"
    data = sub_res.json()
    print("Submission Result:")
    print(json.dumps(data, indent=2))
    assert data["status"] in ("completed", "graded", "passed"), f"Unexpected status: {data['status']}"
    assert data["tests_passed"] == 2
    assert data["tests_total"] == 2
    assert data["earned_points"] == 100.0
    print(">>> PASS: Valid code submitted and evaluated successfully with 2/2 tests passing!")

    print("\n=== Step 4: Submit Code With Runtime Error ===")
    error_code = """import sys
print(1 / 0)
"""
    err_res = requests.post(
        f"{BASE_URL}/submissions",
        headers=headers,
        json={
            "assignment_id": "assign-two-sum-01",
            "language": "python",
            "source_code": error_code
        }
    )
    print(f"Error submission status code: {err_res.status_code}")
    err_data = err_res.json()
    print(json.dumps(err_data, indent=2))
    assert err_data["tests_passed"] == 0
    assert err_data["earned_points"] == 0.0
    print(">>> PASS: Runtime error correctly detected without fake success!")

if __name__ == "__main__":
    test_flow()
