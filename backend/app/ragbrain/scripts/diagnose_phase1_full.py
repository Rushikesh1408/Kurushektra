import shutil
import subprocess
import os
import glob
import sys

def run_cmd(cmd, desc=""):
    print(f"\n--- {desc} [{ ' '.join(cmd) if isinstance(cmd, list) else cmd }] ---")
    try:
        r = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, timeout=20)
        out = r.stdout.strip()
        err = r.stderr.strip()
        if out:
            print("STDOUT:")
            print(out)
        if err:
            print("STDERR:")
            print(err)
        print(f"EXIT CODE: {r.returncode}")
        return out, err, r.returncode
    except Exception as e:
        print(f"ERROR: {e}")
        return "", str(e), -1

print("========================================")
print("PHASE 1 DIAGNOSTICS: DOCKER & SYSTEM")
print("========================================")

# 1. Free disk space
print("\n=== 1. DISK DRIVES ===")
for d in ['C', 'D', 'E']:
    try:
        u = shutil.disk_usage(f"{d}:")
        print(f"{d}: Total={round(u.total/1e9, 2)} GB, Used={round(u.used/1e9, 2)} GB, Free={round(u.free/1e9, 2)} GB ({round(u.free/(1024**3), 2)} GiB)")
    except Exception as e:
        print(f"{d}: Error {e}")

# 2. Docker Desktop installation and version
print("\n=== 2. DOCKER DESKTOP INSTALLATION & VERSION ===")
paths = [
    r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
    r"C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    r"C:\Program Files\Docker\Docker\resources\com.docker.service.exe"
]
for p in paths:
    print(f"{p} exists: {os.path.exists(p)}")

run_cmd(['powershell', '-Command', '(Get-Item "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe").VersionInfo | Format-List'], "Docker Desktop VersionInfo")

# 3. com.docker.service status
print("\n=== 3. COM.DOCKER.SERVICE STATUS ===")
run_cmd(['powershell', '-Command', 'Get-Service com.docker.service -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType, DisplayName | Format-List'], "com.docker.service status")

# 4. WSL status and distros
print("\n=== 4. WSL STATUS & DISTROS ===")
run_cmd(['wsl', '--version'], "WSL Version")
run_cmd(['wsl', '--status'], "WSL Status")
run_cmd(['wsl', '--list', '--verbose'], "WSL Distro List")
run_cmd(['wsl', '-d', 'Ubuntu', '-e', 'uname', '-a'], "WSL Ubuntu Test")

# 5. Docker CLI
print("\n=== 5. DOCKER CLI OUTPUT ===")
run_cmd(['docker', 'version'], "docker version")
run_cmd(['docker', 'info'], "docker info")
run_cmd(['docker', 'ps'], "docker ps")

# 6. Docker Desktop logs
print("\n=== 6. DOCKER DESKTOP LOGS ===")
localappdata = os.environ.get('LOCALAPPDATA', r'C:\Users\ASUS\AppData\Local')
appdata = os.environ.get('APPDATA', r'C:\Users\ASUS\AppData\Roaming')

log_dirs = [
    os.path.join(localappdata, 'Docker', 'log'),
    os.path.join(localappdata, 'Docker', 'log', 'host'),
    os.path.join(appdata, 'Docker')
]

for ld in log_dirs:
    if os.path.exists(ld):
        print(f"Log dir exists: {ld}")
        files = glob.glob(os.path.join(ld, "*.*"))
        # sort by modification time descending
        files.sort(key=os.path.getmtime, reverse=True)
        for f in files[:5]:
            mtime = os.path.getmtime(f)
            size = os.path.getsize(f)
            print(f"  File: {f} (size={size} bytes)")

# Read latest log files
host_log = os.path.join(localappdata, 'Docker', 'log', 'host', 'com.docker.backend.exe.log')
service_log = os.path.join(localappdata, 'Docker', 'log', 'host', 'com.docker.service.log')
for log_path in [host_log, service_log]:
    if os.path.exists(log_path):
        print(f"\n--- Tail of {log_path} ---")
        try:
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as lf:
                lines = lf.readlines()
                for line in lines[-25:]:
                    print(line.rstrip())
        except Exception as e:
            print(f"Could not read {log_path}: {e}")

# 7. Virtualization features
print("\n=== 7. VIRTUALIZATION FEATURES ===")
run_cmd(['powershell', '-Command', 'Get-CimInstance Win32_Processor | Select-Object Name, VirtualizationFirmwareEnabled'], "Hardware Virtualization Firmware Enabled")
run_cmd(['powershell', '-Command', 'Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V, VirtualMachinePlatform | Select-Object FeatureName, State'], "Windows Optional Features")

# 8. Docker WSL distributions and virtual disks
print("\n=== 8. DOCKER WSL DISTRIBUTIONS AND DISKS ===")
docker_wsl_path = os.path.join(localappdata, 'Docker', 'wsl')
if os.path.exists(docker_wsl_path):
    print(f"Docker WSL path: {docker_wsl_path}")
    for root, dirs, files in os.walk(docker_wsl_path):
        for f in files:
            fp = os.path.join(root, f)
            print(f"  {fp} ({round(os.path.getsize(fp)/(1024**2), 2)} MB)")
else:
    print(f"Docker WSL path {docker_wsl_path} does NOT exist.")

# Check settings.json
settings_json = os.path.join(appdata, 'Docker', 'settings.json')
if os.path.exists(settings_json):
    print(f"\nDocker settings.json ({settings_json}):")
    try:
        with open(settings_json, 'r') as sf:
            print(sf.read())
    except Exception as e:
        print(f"Error reading settings.json: {e}")
else:
    print(f"settings.json does not exist at {settings_json}")
