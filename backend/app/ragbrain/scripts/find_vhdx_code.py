import re

exe = r"C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
with open(exe, "rb") as f:
    data = f.read()

idx = 0
while True:
    idx = data.find(b"monodistro", idx)
    if idx == -1:
        break
    start = max(0, idx - 150)
    end = min(len(data), idx + 250)
    print("MATCH at", idx)
    print(repr(data[start:end]))
    idx += len(b"monodistro")
