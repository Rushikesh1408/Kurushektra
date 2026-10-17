import subprocess
import time
import os

print("Starting Docker Desktop...")
p = subprocess.Popen([r"C:\Program Files\Docker\Docker\Docker Desktop.exe"])
print(f"Started launcher PID: {p.pid}")

for i in range(12):
    time.sleep(2)
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name '*docker*' -ErrorAction SilentlyContinue | Select-Object Name, Id | Format-Table -AutoSize"],
        capture_output=True,
        text=True
    )
    output = res.stdout.strip()
    if output:
        print(f"Check {i+1} ({(i+1)*2}s):\n{output}")
    else:
        print(f"Check {i+1} ({(i+1)*2}s): [No docker processes running]")
