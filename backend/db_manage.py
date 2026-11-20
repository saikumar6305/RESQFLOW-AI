"""Read-only SQLite inspection and safe online backup for RESQFLOW AI.

Run from backend/: python db_manage.py status|tables|check|backup
"""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent
DB = ROOT / 'resqflow.db'


def main():
    parser = argparse.ArgumentParser(description='RESQFLOW AI SQLite database management')
    parser.add_argument('command', choices=['status', 'tables', 'check', 'backup'])
    args = parser.parse_args()
    if not DB.is_file():
        parser.error(f'Database not found at {DB}. Start the FastAPI backend once to initialize it.')
    with sqlite3.connect(f'{DB.as_uri()}?mode=ro', uri=True, timeout=10) as source:
        if args.command == 'status':
            print(f'Database: {DB}\nSize: {DB.stat().st_size:,} bytes')
            tables = [row[0] for row in source.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
            for table in tables:
                # table names are from SQLite's own schema; double-quote identifiers
                safe = table.replace('"', '""')
                count = source.execute(f'SELECT COUNT(*) FROM "{safe}"').fetchone()[0]
                print(f'  {table}: {count} records')
        elif args.command == 'tables':
            for name, sql in source.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
                print(f'\n{name}\n{sql}')
        elif args.command == 'check':
            results = [r[0] for r in source.execute('PRAGMA integrity_check')]
            print('\n'.join(results))
            if results != ['ok']:
                raise SystemExit(1)
        elif args.command == 'backup':
            folder = ROOT / 'backups'
            folder.mkdir(exist_ok=True)
            dest = folder / f'resqflow-{datetime.now(timezone.utc):%Y%m%d-%H%M%S-%f}.db'
            with sqlite3.connect(dest) as target:
                source.backup(target)
            print(f'Backup created: {dest}')


if __name__ == '__main__':
    main()
