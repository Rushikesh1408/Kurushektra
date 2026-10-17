import json
import os

appdata = os.environ.get('APPDATA', '')
for fn in ['settings.json', 'settings-store.json']:
    p = os.path.join(appdata, 'Docker', fn)
    if os.path.exists(p):
        with open(p, 'r') as f:
            d = json.load(f)
            print(f"{fn} keys: {list(d.keys())}")
