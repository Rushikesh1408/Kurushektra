import base64
import json
import urllib.request

def b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()

def unb64(s: str | None) -> str:
    return base64.b64decode(s).decode("utf-8", errors="replace") if s else ""

def submit(source: str, lang_id: int = 71, **kwargs):
    payload = {
        "source_code": b64(source),
        "language_id": lang_id,
        "enable_per_process_and_thread_time_limit": True,
        "enable_per_process_and_thread_memory_limit": True,
    }
    payload.update(kwargs)
    req = urllib.request.Request(
        "http://sandbox:2358/submissions?base64_encoded=true&wait=true",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    return {
        "status": data.get("status"),
        "stdout": unb64(data.get("stdout")),
        "stderr": unb64(data.get("stderr")),
        "time": data.get("time"),
        "memory": data.get("memory"),
        "compile_output": unb64(data.get("compile_output")),
        "message": data.get("message"),
    }

def main():
    print("=" * 60)
    print("TEST 1: Python output 42")
    res1 = submit("print(40 + 2)", 71)
    print(res1)

    print("\nTEST 2: JavaScript output 42")
    res2 = submit("console.log(40 + 2)", 63)
    print(res2)

    print("\nTEST 3: Syntax error")
    res3 = submit("def foo(:", 71)
    print(res3)

    print("\nTEST 4: Runtime error")
    res4 = submit('raise ValueError("deliberate test error")', 71)
    print(res4)

    print("\nTEST 5: Time limit (infinite loop)")
    res5 = submit("while True: pass", 71, cpu_time_limit=1.0, wall_time_limit=2.0)
    print(res5)

    print("\nTEST 6: Memory limit")
    res6 = submit("x = bytearray(300 * 1024 * 1024)", 71, memory_limit=50000)
    print(res6)

    print("\nTEST 7: Output limit")
    res7 = submit('print("A" * 2000000)', 71, max_file_size=64)
    print(res7)

    print("\nTEST 8: Process limit (fork bomb)")
    code_fork = """import os
for _ in range(100):
    try:
        os.fork()
    except Exception as e:
        print("FORK_CAUGHT:", type(e).__name__)
        break
print("FORK_TEST_FINISHED")
"""
    res8 = submit(code_fork, 71, max_processes_and_or_threads=5)
    print(res8)

    print("\nTEST 9: Network egress attempt")
    code_net = """import urllib.request
try:
    urllib.request.urlopen("http://postgres:5432", timeout=2)
    print("CONNECTED")
except Exception as e:
    print("NETWORK_BLOCKED:", type(e).__name__)
"""
    res9 = submit(code_net, 71)
    print(res9)

    print("\nTEST 10: Filesystem isolation")
    code_fs = """import os
print("/app exists:", os.path.exists("/app"))
print("/root exists:", os.path.exists("/root"))
print("/etc/shadow exists:", os.path.exists("/etc/shadow"))
"""
    res10 = submit(code_fs, 71)
    print(res10)
    print("=" * 60)

if __name__ == "__main__":
    main()
