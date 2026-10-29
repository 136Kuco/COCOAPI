"""Real SQLite migration, concurrent admission and key lifecycle checks."""
import sqlite3, tempfile, pathlib, concurrent.futures, hashlib
root = pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
    path = str(pathlib.Path(tmp)/'test.db')
    db = sqlite3.connect(path)
    for migration in sorted((root/'drizzle').glob('*.sql')):
        db.executescript(migration.read_text())
    db.close()
    # Exactly the same INSERT statement as the server (read, not mirrored).
    source = (root/'lib/upstream-probe.ts').read_text()
    sql = source.split('export const reservationSQL = `')[1].split('`;')[0]
    def reserve(i):
        conn = sqlite3.connect(path,timeout=10)
        try:
            r=conn.execute(sql,(str(i),'2026-10-29','2026-10-29T00:00:00Z','deepseek-flash','2026-10-29'))
            conn.commit()
            return r.rowcount
        finally: conn.close()
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        accepted=sum(pool.map(reserve,range(32)))
    assert accepted == 3, accepted
    # Reopen the file: reservations survive connections, failures retain slots.
    db=sqlite3.connect(path)
    assert db.execute('SELECT count(*) FROM connection_tests').fetchone()[0] == 3
    assert db.execute('SELECT input_tokens FROM connection_tests LIMIT 1').fetchone()[0] is None
    keyhash=hashlib.sha256(b'disposable-fixture').hexdigest()
    db.execute('INSERT INTO api_keys VALUES(?,?,?,?,?,?)',('test','test',keyhash,'fixture',1,'now'))
    query='SELECT id FROM api_keys WHERE hash=? AND enabled=1'
    assert db.execute(query,(keyhash,)).fetchone() == ('test',)
    db.execute('UPDATE api_keys SET enabled=0 WHERE id=?',('test',))
    assert db.execute(query,(keyhash,)).fetchone() is None
    db.commit(); db.close()
    db=sqlite3.connect(path)
    assert db.execute('SELECT enabled FROM api_keys WHERE id=?',('test',)).fetchone() == (0,)
    db.close()
print('PASS: migrations, 32 concurrent reservations capped at 3, key disable, persisted reopen')
