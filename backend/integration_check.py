"""Read-only local integration checks. Run after start-resqflow.bat."""
import json
import sqlite3
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent

def check_url(label, url, expected_key=None):
    try:
        with urlopen(url, timeout=5) as response:
            data = response.read()
            if response.status != 200:
                raise RuntimeError(f"HTTP {response.status}")
            if expected_key:
                payload = json.loads(data)
                if payload.get(expected_key) != 'ok':
                    raise RuntimeError(f"Unexpected {expected_key}: {payload.get(expected_key)}")
        print(f"[PASS] {label}: {url}")
        return True
    except (URLError, HTTPError, ValueError, RuntimeError, TimeoutError) as exc:
        print(f"[FAIL] {label}: {exc}")
        return False

def main():
    passed = []
    passed.append(check_url('Backend health', 'http://127.0.0.1:8000/api/health', 'status'))
    passed.append(check_url('Frontend page', 'http://127.0.0.1:5173/'))
    passed.append(check_url('Vite-to-FastAPI proxy', 'http://127.0.0.1:5173/api/health', 'status'))
    db = ROOT / 'resqflow.db'
    if not db.exists():
        print(f'[FAIL] SQLite file missing: {db}')
        passed.append(False)
    else:
        try:
            with sqlite3.connect(f'file:{db.as_posix()}?mode=ro', uri=True) as conn:
                tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                result = conn.execute('PRAGMA integrity_check').fetchone()[0]
                ok = result == 'ok' and {'incidents', 'victims', 'resources', 'users'}.issubset(tables)
                print(f"[{'PASS' if ok else 'FAIL'}] SQLite: integrity={result}, tables={', '.join(sorted(tables))}")
                passed.append(ok)
        except sqlite3.Error as exc:
            print(f'[FAIL] SQLite: {exc}')
            passed.append(False)
    print(f'\nResult: {sum(passed)}/{len(passed)} checks passed')
    if not all(passed):
        print('Keep both server windows open, then retry. See README.')
        raise SystemExit(1)

if __name__ == '__main__':
    main()
