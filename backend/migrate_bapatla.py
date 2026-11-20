"""One-time migration of known original Hyderabad seed records in an EXISTING SQLite DB.

Backs up the DB first. Does not touch custom records or passwords.
Run with the backend STOPPED to avoid concurrent writes.
"""
from pathlib import Path
import sqlite3
import sys
from datetime import datetime

DB = Path(__file__).resolve().parent / 'resqflow.db'
REPLACEMENTS = {
    'incidents': {
        'RF-1042': ('Kukatpally, Hyderabad', 'Bapatla Town, Bapatla district', 15.9042, 80.4675),
        'RF-1041': ('Miyapur, Hyderabad', 'Suryalanka, Bapatla district', 15.8620, 80.5020),
        'RF-1039': ('Hitech City, Hyderabad', 'Chirala, Bapatla district', 15.8238, 80.3522),
        'RF-1037': ('Ameerpet, Hyderabad', 'Karlapalem, Bapatla district', 15.9330, 80.4300),
    },
    'resources': {
        'AMB-01': ('Kukatpally', 'Bapatla Town', 15.9050, 80.4710),
        'AMB-02': ('Miyapur', 'Suryalanka', 15.8600, 80.5000),
        'AMB-03': ('Hitech City', 'Chirala', 15.8250, 80.3550),
        'AMB-04': ('Ameerpet', 'Karlapalem', 15.9320, 80.4320),
        'H-01': ('Kukatpally', 'Bapatla Town', 15.9070, 80.4690),
        'H-02': ('Miyapur', 'Suryalanka', 15.8640, 80.5010),
        'H-03': ('Madhapur', 'Vetapalem', 15.7840, 80.3060),
        'H-04': ('Begumpet', 'Repalle', 16.0184, 80.8296),
    },
}

def main():
    if not DB.exists():
        sys.exit('No existing database. Start the backend to create a fresh Bapatla dataset.')
    with sqlite3.connect(DB) as con:
        backup_dir = DB.parent / 'backups'
        backup_dir.mkdir(exist_ok=True)
        backup_path = backup_dir / f'resqflow-before-bapatla-{datetime.now():%Y%m%d-%H%M%S}.db'
        with sqlite3.connect(backup_path) as backup:
            con.backup(backup)
        print('Backup:', backup_path)
        total = 0
        for table, records in REPLACEMENTS.items():
            for key, (old, new, lat, lng) in records.items():
                cur = con.execute(f'UPDATE {table} SET location=?, lat=?, lng=? WHERE id=? AND location=?', (new, lat, lng, key, old))
                total += cur.rowcount
        con.commit()
        print(f'Updated {total} known Hyderabad seed rows. Custom records left unchanged.')
        print('SQLite integrity:', con.execute('PRAGMA integrity_check').fetchone()[0])
        print('Restart backend and refresh browser to load Bapatla records.')

if __name__ == '__main__':
    main()
