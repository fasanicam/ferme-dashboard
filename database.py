import sqlite3
from datetime import datetime

DB_NAME = "ferme.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Table for sensor measurements
    c.execute('''CREATE TABLE IF NOT EXISTS measurements
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  module TEXT,
                  variable TEXT,
                  value REAL,
                  timestamp DATETIME)''')
    
    # Table for message statistics (e.g., count per minute)
    c.execute('''CREATE TABLE IF NOT EXISTS message_stats
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp DATETIME)''')
    conn.commit()
    conn.close()

def save_measurement(module, variable, value):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO measurements (module, variable, value, timestamp) VALUES (?, ?, ?, ?)",
              (module, variable, value, datetime.now()))
    conn.commit()
    conn.close()

def log_message_receipt():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO message_stats (timestamp) VALUES (?)", (datetime.now(),))
    conn.commit()
    conn.close()

def get_history(module, variable, limit=100):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT value, timestamp FROM measurements WHERE module=? AND variable=? ORDER BY timestamp DESC LIMIT ?",
              (module, variable, limit))
    data = c.fetchall()
    conn.close()
    # Return reversed to show oldest to newest in chart
    return data[::-1]

def get_message_stats(limit=60):
    """Returns message count per minute for the last 'limit' minutes."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Group by minute
    c.execute('''SELECT strftime('%Y-%m-%d %H:%M', timestamp) as minute, COUNT(*) 
                 FROM message_stats 
                 GROUP BY minute 
                 ORDER BY minute DESC LIMIT ?''', (limit,))
    data = c.fetchall()
    conn.close()
    return data[::-1]
