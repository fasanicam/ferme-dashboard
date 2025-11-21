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
    
    # Table for module publication tracking (hourly)
    c.execute('''CREATE TABLE IF NOT EXISTS module_publications
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  module TEXT,
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

def log_module_publication(module):
    """Log a publication for a specific module."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO module_publications (module, timestamp) VALUES (?, ?)", (module, datetime.now()))
    conn.commit()
    conn.close()

def get_module_publication_trends(hours=24):
    """Returns publication count per hour per module for the last 'hours' hours."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Group by hour and module
    c.execute('''SELECT module, strftime('%Y-%m-%d %H:00', timestamp) as hour, COUNT(*) 
                 FROM module_publications 
                 WHERE timestamp >= datetime('now', '-' || ? || ' hours')
                 GROUP BY module, hour 
                 ORDER BY hour ASC''', (hours,))
    data = c.fetchall()
    conn.close()
    return data

def get_all_modules_with_variables():
    """Get all modules with their variables for admin interface."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''SELECT DISTINCT module, variable 
                 FROM measurements 
                 ORDER BY module, variable''')
    data = c.fetchall()
    conn.close()
    
    # Group by module
    modules = {}
    for module, variable in data:
        if module not in modules:
            modules[module] = []
        modules[module].append(variable)
    
    return modules

def delete_variable_permanently(module, variable):
    """Permanently delete a variable and all its measurements."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM measurements WHERE module=? AND variable=?", (module, variable))
    deleted_count = c.rowcount
    conn.commit()
    conn.close()
    return deleted_count

def delete_module_permanently(module):
    """Permanently delete a module and all its variables/measurements."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Delete from measurements
    c.execute("DELETE FROM measurements WHERE module=?", (module,))
    measurements_deleted = c.rowcount
    
    # Delete from module_publications
    c.execute("DELETE FROM module_publications WHERE module=?", (module,))
    publications_deleted = c.rowcount
    
    conn.commit()
    conn.close()
    
    return {
        'measurements': measurements_deleted,
        'publications': publications_deleted
    }
