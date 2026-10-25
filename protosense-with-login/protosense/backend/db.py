import os, json, sqlite3
BACKEND = os.getenv('DB_BACKEND', 'mysql')  # 'mysql' or 'sqlite' (quick local mode)
HERE = os.path.dirname(__file__)

def conn():
    if BACKEND == 'sqlite':
        c = sqlite3.connect(os.getenv('SQLITE_PATH', os.path.join(HERE, 'protosense.db')))
        c.row_factory = sqlite3.Row
        return c
    import pymysql
    return pymysql.connect(host=os.getenv('DB_HOST', 'localhost'), port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USER', 'root'), password=os.getenv('DB_PASSWORD', ''), database=os.getenv('DB_NAME', 'protosense'),
        cursorclass=pymysql.cursors.DictCursor, charset='utf8mb4')

def q(sql, args=(), one=False, write=False):
    c = conn()
    try:
        cur = c.cursor()
        cur.execute(sql.replace('%s', '?') if BACKEND == 'sqlite' else sql, args)
        if write:
            c.commit(); return None
        rows = [dict(r) for r in cur.fetchall()]
        return (rows[0] if rows else None) if one else rows
    finally:
        c.close()

def init():
    for stmt in open(os.path.join(HERE, 'schema.sql')).read().split(';'):
        if stmt.strip(): q(stmt, write=True)
    if q('SELECT COUNT(*) AS n FROM experiments', one=True)['n'] == 0:
        for r in json.load(open(os.path.join(HERE, 'seed.json'))):
            q('REPLACE INTO experiments VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)', r, write=True)
