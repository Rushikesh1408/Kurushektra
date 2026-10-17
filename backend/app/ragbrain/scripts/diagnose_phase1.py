import shutil
import subprocess
import os
import glob
import sys

print("=== 1. DISK DRIVES ===")
for d in ['C', 'D', 'E']:
    try:
        u = shutil.disk_usage(f"{d}:\\")
        print(f"{d}: Total={round(u.total/(1024**3), 2)} GiB, Used={round(u.used/(1024**3), 2)} GiB, Free={round(u.free/(1024**3), 2)} GiB")
    except Exception as e:
        print(f"{d}: Error {e}")

print("\n=== 2. DOCKER DESKTOP INSTALLATION & VERSION ===")
exe = r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
print(f"Docker Desktop Executable exists: {os.path.exists(exe)}")
docker_cli = shutil.which("docker")
print(f"Docker CLI path: {docker_cli}")
if os.path.exists(exe):
    # Try getting version from powershell
    res = subprocess.run(['powershell', '-Command', f"(Get-Item '{exe}').VersionInfo.FileVersion"], capture_output=True, text=True)
    print(f"Docker Desktop File Version: {res.stdout.strip()}")

print("\n=== 3. COM.DOCKER.SERVICE STATUS ===")
res = subprocess.run(['powershell', '-Command', 'Get-Service com.docker.service -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType, DisplayName | Format-List'], capture_output=True, text=True)
print(res.stdout or res.stderr)

print("\n=== 4. WSL STATUS & DISTROS ===")
for cmd in [['wsl', '--version'], ['wsl', '--status'], ['wsl', '--list', '--verbose']]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True)
        cmd_str = ' '.join(cmd)
        print(f"CMD: {cmd_str}\n{r.stdout or r.stderr}")
    except Exception as e:
        print(f"CMD {cmd} error: {e}")

print("\n=== 5. DOCKER CLI OUTPUT ===")
for cmd in [['docker', 'version'], ['docker', 'info']]:
    r = subprocess.run(cmd, capture_output=True, text=True)
    cmd_str = ' '.join(cmd)
    print(f"CMD: {cmd_str}\nSTDOUT:\n{r.stdout}\nSTDERR:\n{r.stderr}\nEXIT CODE: {r.returncode}")

print("\n=== 6. VIRTUALIZATION & HYPER-V FEATURES ===")
v_cmd = "Get-CimInstance Win32_Processor | Select-Object Name, VirtualizationFirmwareEnabled, SecondLevelAddressTranslationExtensions"
res = subprocess.run(['powershell', '-Command', v_cmd], capture_output=True, text=True)
print("Hardware Virtualization:\n" + res.stdout)

# Check Windows Optional Features for WSL / VirtualMachinePlatform
f_cmd = "Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform, Microsoft-Windows-Subsystem-Linux | Select-Object FeatureName, State"
res = subprocess.run(['powershell', '-Command', f_cmd], capture_output=True, text=True)
print("Windows Features:\n" + res.stdout)

print("\n=== 7. DOCKER WSL DISTRIBUTIONS AND VIRTUAL DISKS ===")
# Check where docker stores WSL data
local_app_data = os.environ.get("LOCALAPPDATA", "")
docker_wsl_path = os.path.join(local_app_data, "Docker", "wsl")
print(f"Checking {docker_wsl_path}: exists={os.path.exists(docker_wsl_path)}")
if os.path.exists(docker_wsl_path):
    for root, dirs, files in os.walk(docker_wsl_path):
        for f in files:
            fp = os.path.join(root, f)
            size_mb = os.path.getsize(fp) / (1024*1024)
            print(f"  {fp}: {round(size_mb, 2)} MB")

appdata = os.environ.get("APPDATA", "")
docker_settings = os.path.join(appdata, "Docker", "settings.json")
print(f"Checking {docker_settings}: exists={os.path.exists(docker_settings)}")
if os.path.exists(docker_settings):
    try:
        with open(docker_settings, "r") as f:
            print("settings.json content:\n" + f.read()[:1000])
    except Exception as e:
        print(f"Error reading settings.json: {e}")

print("\n=== 8. DOCKER LOGS & RECENT ERRORS ===")
log_dirs = [
    os.path.join(local_app_data, "Docker", "log"),
    os.path.join(local_app_data, "Docker", "log", "vm"),
    os.path.join(local_app_data, "Docker", "log", "host"),
]
for ld in log_dirs:
    if os.path.exists(ld):
        print(f"\nListing logs in {ld}:")
        files = glob.glob(os.path.join(ld, "*.*"))
        for f in sorted(files, key=os.path.getmtime, reverse=True)[:5]:
            mtime = os.path.getmtime(f)
            print(f"  {os.path.basename(f)} (size: {os.path.getsize(f)} bytes)")
            # print tail of latest log
            try:
                with open(f, "r", encoding="utf-8", errors="replace") as lf:
                    lines = lf.readlines()
                    print(f"    --- TAIL of {os.path.basename(f)} ({len(lines)} lines) ---")
                    for l in lines[-10:]:
                        print("    " + l.strip())
            except Exception as e:
                print(f"    Could not read {f}: {e}")
