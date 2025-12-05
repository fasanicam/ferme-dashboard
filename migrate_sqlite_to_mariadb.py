import sqlite3
import mysql.connector
import os
import sys
from datetime import datetime

# Configuration Database (MariaDB)
DB_HOST = os.environ.get('DB_HOST', 'db_bzh')
DB_USER = os.environ.get('DB_USER', 'prof_bzh')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'prof_bzh@root')
DB_NAME = os.environ.get('DB_NAME', 'icambzh')

SQLITE_DB = "ferme.db"

def get_mariadb_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MariaDB: {err}")
        sys.exit(1)

def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"SQLite database {SQLITE_DB} not found. Skipping migration.")
        return

    print("Starting migration from SQLite to MariaDB...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to MariaDB
    mariadb_conn = get_mariadb_connection()
    mariadb_cursor = mariadb_conn.cursor()
    
    # 1. Migrate measurements
    print("Migrating measurements...")
    sqlite_cursor.execute("SELECT module, variable, value, timestamp FROM measurements")
    rows = sqlite_cursor.fetchall()
    
    if rows:
        print(f"Found {len(rows)} measurements to migrate.")
        # Batch insert
        query = "INSERT INTO measurements (module, variable, value, timestamp) VALUES (%s, %s, %s, %s)"
        # Convert rows to list of tuples with correct types if needed (SQLite returns strings for dates sometimes)
        # But mysql connector handles strings for datetime usually.
        mariadb_cursor.executemany(query, rows)
        mariadb_conn.commit()
        print("Measurements migrated.")
    else:
        print("No measurements found.")

    # 2. Migrate message_stats
    print("Migrating message_stats...")
    sqlite_cursor.execute("SELECT timestamp FROM message_stats")
    rows = sqlite_cursor.fetchall()
    
    if rows:
        print(f"Found {len(rows)} message_stats to migrate.")
        query = "INSERT INTO message_stats (timestamp) VALUES (%s)"
        mariadb_cursor.executemany(query, rows)
        mariadb_conn.commit()
        print("Message_stats migrated.")
    
    # 3. Migrate module_publications
    print("Migrating module_publications...")
    sqlite_cursor.execute("SELECT module, timestamp FROM module_publications")
    rows = sqlite_cursor.fetchall()
    
    if rows:
        print(f"Found {len(rows)} module_publications to migrate.")
        query = "INSERT INTO module_publications (module, timestamp) VALUES (%s, %s)"
        mariadb_cursor.executemany(query, rows)
        mariadb_conn.commit()
        print("Module_publications migrated.")

    sqlite_conn.close()
    mariadb_conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    # Wait a bit for DB to be ready if running in entrypoint
    import time
    time.sleep(2)
    
    # Initialize DB schema first
    import database
    database.init_db()
    
    # Then migrate data
    migrate()
