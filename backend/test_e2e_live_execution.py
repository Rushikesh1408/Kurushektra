"""
End-to-end verification script for COGNICODE code submission through Judge0.
Submits Python 3 code solving 'Reverse words (fixture)' via the live API:
  Input: 'one two three' -> Expected output: 'three two one'
  Solution in Python:
    import sys
    line = sys.stdin.read().strip()
    if line:
        words = line.split()
        print(' '.join(reversed(words)))
"""
import time
import requests

API = "http://localhost:8000/api/v1"

def run_test():
    session = requests.Session()

    # 1. Register a student user
    email = f"student_test_{int(time.time())}@example.com"
    password = "StudentPassword123!"
    reg_resp = session.post(f"{API}/auth/register", json={
        "email": email,
        "full_name": "Test Student",
        "password": password
    })
    print(f"Register status: {reg_resp.status_code}")
    assert reg_resp.status_code in (200, 201), reg_resp.text

    # 2. Login to get token / session
    login_resp = session.post(f"{API}/auth/login", json={
        "email": email,
        "password": password
    })
    print(f"Login status: {login_resp.status_code}")
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get the challenge
    slug = "reverse-words-fixture"
    ch_resp = session.get(f"{API}/challenges/{slug}", headers=headers)
    print(f"Get challenge status: {ch_resp.status_code}")
    assert ch_resp.status_code == 200, ch_resp.text
    ch_data = ch_resp.json()
    ch_id = ch_data["id"]
    print(f"Challenge ID: {ch_id}, Title: {ch_data['title']}")

    # 4. Submit custom run (run_code endpoint) with 'print(40 + 2)'
    print("\n--- Submitting Custom Run: print(40 + 2) ---")
    run_resp = session.post(f"{API}/challenges/{ch_id}/run", headers=headers, json={
        "language": "python3",
        "source_code": "import sys\nprint(40 + 2)\n",
        "custom_input": "ignored"
    })
    print(f"Run code status: {run_resp.status_code}")
    assert run_resp.status_code == 202, run_resp.text
    sub_data = run_resp.json()
    sub_id = sub_data["id"]
    print(f"Enqueued run submission ID: {sub_id}")

    # 5. Poll for completion
    for i in range(20):
        time.sleep(1)
        poll_resp = session.get(f"{API}/submissions/{sub_id}", headers=headers)
        assert poll_resp.status_code == 200, poll_resp.text
        res = poll_resp.json()
        status = res.get("status")
        print(f"Poll {i+1}: status={status}")
        if status in ("completed", "failed"):
            print("Final submission response:", res)
            assert status == "completed", f"Submission failed: {res}"
            assert res.get("custom_output") == "42", f"Unexpected output: {res.get('custom_output')}"
            print(">>> SUCCESS: Custom run produced 42 via Judge0 live sandbox!")
            break
    else:
        raise TimeoutError("Submission timed out waiting for worker")

    # 6. Submit full test suite solution for 'Reverse words (fixture)'
    print("\n--- Submitting Full Solution for Reverse Words ---")
    solution_code = (
        "import sys\n"
        "lines = sys.stdin.read().splitlines()\n"
        "for line in lines:\n"
        "    if line:\n"
        "        print(' '.join(reversed(line.split())))\n"
    )
    full_resp = session.post(f"{API}/challenges/{ch_id}/submissions", headers=headers, json={
        "language": "python3",
        "source_code": solution_code
    })
    print(f"Submit code status: {full_resp.status_code}")
    assert full_resp.status_code == 202, full_resp.text
    full_sub_id = full_resp.json()["id"]
    print(f"Enqueued full submission ID: {full_sub_id}")

    # Poll for completion
    for i in range(25):
        time.sleep(1)
        poll_resp = session.get(f"{API}/submissions/{full_sub_id}", headers=headers)
        assert poll_resp.status_code == 200, poll_resp.text
        res = poll_resp.json()
        status = res.get("status")
        print(f"Poll {i+1}: status={status}")
        if status in ("completed", "failed"):
            print("Final full submission response:", res)
            print(f"Summary: total={res.get('total')}, passed={res.get('passed')}, ratio={res.get('correctness_ratio')}")
            assert res.get("passed") == res.get("total") and res.get("total") > 0
            assert res.get("correctness_ratio") == 1.0
            print(">>> SUCCESS: Full test suite passed with 100% ACCEPTED via Judge0 live sandbox!")
            break
    else:
        raise TimeoutError("Full submission timed out waiting for worker")

    # 7. Submit C++ (GCC) code: print 40 + 2
    print("\n--- Submitting C++ Run: std::cout << 40 + 2 ---")
    cpp_code = "#include <iostream>\nint main() { std::cout << 40 + 2 << std::endl; return 0; }\n"
    cpp_resp = session.post(f"{API}/challenges/{ch_id}/run", headers=headers, json={
        "language": "cpp",
        "source_code": cpp_code,
        "custom_input": "ignored"
    })
    print(f"C++ run status: {cpp_resp.status_code}")
    assert cpp_resp.status_code == 202, cpp_resp.text
    cpp_sub_id = cpp_resp.json()["id"]

    for i in range(25):
        time.sleep(1)
        poll_resp = session.get(f"{API}/submissions/{cpp_sub_id}", headers=headers)
        assert poll_resp.status_code == 200, poll_resp.text
        res = poll_resp.json()
        status = res.get("status")
        print(f"C++ Poll {i+1}: status={status}")
        if status in ("completed", "failed"):
            print("C++ submission response:", res)
            assert status == "completed", f"C++ run failed: {res}"
            assert res.get("custom_output") == "42", f"Unexpected C++ output: {res.get('custom_output')}"
            print(">>> SUCCESS: C++ (GCC) compilation and execution produced 42 via Judge0 live sandbox!")
            break
    else:
        raise TimeoutError("C++ submission timed out waiting for worker")

if __name__ == "__main__":
    run_test()

