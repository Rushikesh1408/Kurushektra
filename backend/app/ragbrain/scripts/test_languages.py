import requests

languages = [
    ("Python 3", 71, 'print("Hello Python")'),
    ("Ruby", 72, 'puts "Hello Ruby"'),
    ("Bash", 46, 'echo "Hello Bash"'),
    ("C (GCC 9.2)", 50, '#include <stdio.h>\nint main() { printf("Hello C\\n"); return 0; }'),
    ("C++ (GCC 9.2)", 54, '#include <iostream>\nint main() { std::cout << "Hello C++" << std::endl; return 0; }'),
]

for name, lang_id, code in languages:
    url = 'http://localhost:2358/submissions?wait=true'
    payload = {'source_code': code, 'language_id': lang_id}
    res = requests.post(url, json=payload).json()
    status = res.get("status", {}).get("description")
    stdout = res.get("stdout")
    stderr = res.get("stderr")
    print(f"[{name}] (ID {lang_id}): status={status} stdout={repr(stdout)} stderr={repr(stderr)}")
