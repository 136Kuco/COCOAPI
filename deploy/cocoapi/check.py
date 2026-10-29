import json
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
base='http://127.0.0.1:8080'
def call(path,payload=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urlopen(Request(base+path,data=None if payload is None else json.dumps(payload).encode(),headers=h),timeout=15) as r:return json.load(r)
assert call('/health')['status']=='ok'
print('Health: passed')
with urlopen(base+'/',timeout=15) as r:
 assert r.status==200 and '<html' in r.read().decode().lower()
print('Homepage: passed')
e=dict(line.split('=',1) for line in (Path(__file__).resolve().parents[2] / '.cocoapi-runtime/.env').read_text().splitlines() if line and not line.startswith('#'))
t=call('/api/v1/auth/login',{'email':e['ADMIN_EMAIL'],'password':e['ADMIN_PASSWORD']})['data']['access_token']
assert t
print('Admin login: passed')
name=call('/api/v1/settings/public')['data']['site_name']
assert name=='cocoAPI', 'Expected site_name=cocoAPI'
print('Current site name:',name)
try:call('/api/v1/admin/settings',token=t)
except HTTPError as err:
 data=json.loads(err.read())
 if err.code==423 and data.get('code')=='ADMIN_COMPLIANCE_ACK_REQUIRED':
  print('Admin settings blocked: operator must personally review and accept the application commitment.')
 else:raise
