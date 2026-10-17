import re

exe = r"C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
with open(exe, "rb") as f:
    data = f.read()

# find all strings containing dataFolder
matches = set(re.findall(rb'[^\x00\r\n\t]{3,100}dataFolder[^\x00\r\n\t]{0,100}', data, re.IGNORECASE))
for m in sorted(matches):
    print(m)
