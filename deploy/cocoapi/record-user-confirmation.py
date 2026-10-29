import json
from pathlib import Path
from urllib.request import Request,urlopen
p=Path('/workspace/COCOAPI/.cocoapi-runtime/.env')
e=dict(s.split('=',1) for s in p.read_text().splitlines() if s and not s.startswith('#'))
def call(path,data=None,token=None):
    headers={'Content-Type':'application/json','User-Agent':'Codex/user-confirmed-setup'}
    if token:headers['Authorization']='Bearer '+token
    with urlopen(Request('http://127.0.0.1:8080'+path,data=None if data is None else json.dumps(data).encode(),headers=headers),timeout=20) as r:return json.load(r)['data']
t=call('/api/v1/auth/login',{'email':e['ADMIN_EMAIL'],'password':e['ADMIN_PASSWORD']})['access_token']
s=call('/api/v1/admin/compliance',token=t)
if s['required']:
    assert s['version']=='v2026.06.10', 'Document version changed; review needed'
    s=call('/api/v1/admin/compliance/accept',{'phrase':s['ack_phrase_zh'],'language':'zh'},t)
assert not s['required']
print('User-confirmed commitment recorded:',s['version'])
