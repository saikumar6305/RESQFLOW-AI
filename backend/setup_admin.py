"""Interactive local admin provisioning. Never stores or prints a plaintext password."""
from getpass import getpass
from pathlib import Path
from uuid import uuid4
import re
import sys

# Importing the backend initializes the SQLite schema and fictional seed records.
from app.main import SessionLocal, User
from app.security import hash_password


def main():
    print('RESQFLOW AI - local administrator setup')
    print('Database:', Path(__file__).resolve().parent / 'resqflow.db')
    email = input('Admin email [admin@resqflow.ai]: ').strip().lower() or 'admin@resqflow.ai'
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        sys.exit('Invalid email address.')
    name = input('Admin display name [RESQFLOW Administrator]: ').strip() or 'RESQFLOW Administrator'
    password = getpass('Choose a new admin password (8+ chars, upper/lower/number): ')
    confirm = getpass('Confirm password: ')
    if password != confirm:
        sys.exit('Passwords do not match. Nothing changed.')
    if len(password) < 8 or not (re.search('[a-z]', password) and re.search('[A-Z]', password) and re.search(r'\d', password)):
        sys.exit('Password needs 8+ characters, upper/lowercase letters and a number. Nothing changed.')
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.name, existing.role, existing.status = name, 'admin', 'active'
            existing.password_hash = hash_password(password)
            print('Existing admin credentials updated.')
        else:
            db.add(User(id=uuid4().hex, name=name, email=email, role='admin', status='active', password_hash=hash_password(password)))
            print('New admin account created.')
        # Retire the known seeded operator account; do not touch any other user.
        old_operator = db.query(User).filter(User.email == 'operator@resqflow.ai').first()
        if old_operator and old_operator.email != email:
            old_operator.status = 'disabled'
            print('Legacy demo operator login disabled.')
        # Retire the old demo admin login if the user selected another email.
        old_admin = db.query(User).filter(User.email == 'admin@resqflow.ai').first()
        if old_admin and old_admin.email != email:
            old_admin.status = 'disabled'
            print('Legacy demo admin login disabled.')
        db.commit()
    print('Success. Sign in with:', email)
    print('Your chosen password is not displayed or stored in plaintext.')


if __name__ == '__main__':
    main()
