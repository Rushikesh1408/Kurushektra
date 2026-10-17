"""
Helper script to unpack Ollama portable binary and launch the server.
Stores binaries and models strictly on D:\ to prevent exhausting C: drive.
"""
import os
import sys
import zipfile
import subprocess
import shutil

ZIP_PATH = r"D:\ollama-windows-amd64.zip"
TARGET_DIR = r"D:\Ollama"
MODELS_DIR = r"D:\ollama_models"

def main():
    if not os.path.exists(ZIP_PATH):
        print(f"Error: {ZIP_PATH} does not exist.")
        return 1

    os.makedirs(TARGET_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"Extracting {ZIP_PATH} to {TARGET_DIR}...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
        zf.extractall(TARGET_DIR)
    print("Extraction complete.")

    exe_path = os.path.join(TARGET_DIR, "ollama.exe")
    if not os.path.exists(exe_path):
        print(f"Warning: ollama.exe not directly in {TARGET_DIR}, checking subdirectories...")
        for root, dirs, files in os.walk(TARGET_DIR):
            if "ollama.exe" in files:
                exe_path = os.path.join(root, "ollama.exe")
                print(f"Found ollama.exe at {exe_path}")
                break

    # Test version
    env = os.environ.copy()
    env["OLLAMA_MODELS"] = MODELS_DIR
    res = subprocess.run([exe_path, "--version"], env=env, capture_output=True, text=True)
    print(f"Ollama Version: {res.stdout.strip() or res.stderr.strip()}")

    # Clean up zip to reclaim 1.47 GB
    try:
        os.remove(ZIP_PATH)
        print(f"Cleaned up {ZIP_PATH} to save disk space.")
    except Exception as e:
        print(f"Note: Could not remove zip: {e}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
