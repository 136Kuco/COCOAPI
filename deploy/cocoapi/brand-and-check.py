import json
from pathlib import Path
from urllib.request import Request, urlopen

base = 'http://127.0.0.1:8080'
env = dict(line.split('=', 1) for line in (Path(__file__).resolve().parents[2] / '.cocoapi-runtime/.env').read_text().splitlines() if line and not line.startswith('#'))
def call(path, payload=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = Request(base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers, method=method)
    with urlopen(req, timeout=30) as response:
        return json.load(response)
login = call('/api/v1/auth/login', {'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']})
token = login['data']['access_token']
print('Administrator login: passed')
call('/api/v1/admin/settings', {'site_name': 'cocoAPI'}, token, 'PUT')
public = call('/api/v1/settings/public')
assert public['data']['site_name'] == 'cocoAPI'
print('Public site name: cocoAPI')
with urlopen(base + '/', timeout=15) as response:
    page = response.read().decode()
assert 'cocoAPI' in page
print('Homepage branding: passed')
assert call('/health')['status'] == 'ok'
print('Application health: passed')
