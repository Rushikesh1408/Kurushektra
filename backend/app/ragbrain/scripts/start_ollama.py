"""
Launcher for Ollama Server on D:\ drive as a persistent daemon
"""
import os
import subprocess
import time
import urllib.request
import json

env = os.environ.copy()
env["OLLAMA_MODELS"] = r"D:\ollama_models"
env["OLLAMA_HOST"] = "127.0.0.1:11434"

DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200

print("Starting detached Ollama daemon on 127.0.0.1:11434 with OLLAMA_MODELS=D:\\ollama_models...")
proc = subprocess.Popen(
    [r"D:\Ollama\ollama.exe", "serve"],
    env=env,
    creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
print(f"Ollama server PID: {proc.pid}")

# Wait for server to become responsive
for i in range(15):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=2) as r:
            data = json.loads(r.read().decode())
            print(f"Ollama is LIVE and PERSISTENT! Models: {data}")
            break
    except Exception as e:
        print(f"Waiting for Ollama ({i+1}/15)...")
else:
    print("Ollama server did not respond within 15 seconds.")
