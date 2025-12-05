import mysql.connector
from datetime import datetime
import os
import time
import logging

# Configuration Database
DB_HOST = os.environ.get('DB_HOST', 'db_bzh')
DB_USER = os.environ.get('DB_USER', 'prof_bzh')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'prof_bzh@root')
DB_NAME = os.environ.get('DB_NAME', 'icambzh')

def get_db_connection():
    retries = 5
    while retries > 0:
        try:
            conn = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME
            )
            return conn
        except mysql.connector.Error as err:
            logging.error(f"Erreur de connexion DB: {err}")
            retries -= 1
            time.sleep(2)
    raise Exception("Impossible de se connecter à la base de données")

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Table for sensor measurements
    c.execute('''CREATE TABLE IF NOT EXISTS measurements
                 (id INT AUTO_INCREMENT PRIMARY KEY,
                  module VARCHAR(255),
                  variable VARCHAR(255),
                  value TEXT,
                  timestamp DATETIME)''')
    
    # Table for message statistics (e.g., count per minute)
    c.execute('''CREATE TABLE IF NOT EXISTS message_stats
                 (id INT AUTO_INCREMENT PRIMARY KEY,
                  timestamp DATETIME)''')
    
    # Table for module publication tracking (hourly)
    c.execute('''CREATE TABLE IF NOT EXISTS module_publications
                 (id INT AUTO_INCREMENT PRIMARY KEY,
                  module VARCHAR(255),
                  timestamp DATETIME)''')

    # NEW: Table for detailed MQTT message analysis (Last 1M messages)
    # We will periodically clean this table or use a capped collection approach if needed.
    # For now, standard table.
    c.execute('''CREATE TABLE IF NOT EXISTS mqtt_messages
                 (id INT AUTO_INCREMENT PRIMARY KEY,
                  topic VARCHAR(512),
                  payload TEXT,
                  timestamp DATETIME,
                  project VARCHAR(255),
                  category VARCHAR(50),
                  is_compliant BOOLEAN,
                  INDEX idx_timestamp (timestamp),
                  INDEX idx_project (project))''')

    conn.commit()
    conn.close()

def save_measurement(module, variable, value):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT INTO measurements (module, variable, value, timestamp) VALUES (%s, %s, %s, %s)",
                  (module, variable, value, datetime.now()))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Erreur save_measurement: {e}")

def log_message_receipt():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT INTO message_stats (timestamp) VALUES (%s)", (datetime.now(),))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Erreur log_message_receipt: {e}")

def log_mqtt_message(topic, payload, project, category, is_compliant):
    """Log detailed MQTT message for analysis."""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        # Optional: Maintain only last 1M messages. 
        # This is expensive to do on every insert. Better to do it periodically or via a job.
        # For this implementation, we'll just insert.
        
        c.execute("""INSERT INTO mqtt_messages 
                     (topic, payload, timestamp, project, category, is_compliant) 
                     VALUES (%s, %s, %s, %s, %s, %s)""",
                  (topic, payload, datetime.now(), project, category, is_compliant))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Erreur log_mqtt_message: {e}")

def get_history(module, variable, limit=100):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT value, timestamp FROM measurements WHERE module=%s AND variable=%s ORDER BY timestamp DESC LIMIT %s",
              (module, variable, limit))
    data = c.fetchall()
    conn.close()
    # Return reversed to show oldest to newest in chart
    return data[::-1]

def get_message_stats(limit=60):
    """Returns message count per minute for the last 'limit' minutes."""
    conn = get_db_connection()
    c = conn.cursor()
    # MySQL syntax for date formatting
    c.execute('''SELECT DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i') as minute, COUNT(*) 
                 FROM message_stats 
                 GROUP BY minute 
                 ORDER BY minute DESC LIMIT %s''', (limit,))
    data = c.fetchall()
    conn.close()
    return data[::-1]

def log_module_publication(module):
    """Log a publication for a specific module."""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT INTO module_publications (module, timestamp) VALUES (%s, %s)", (module, datetime.now()))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Erreur log_module_publication: {e}")

def get_module_publication_trends(hours=24):
    """Returns publication count per hour per module for the last 'hours' hours."""
    conn = get_db_connection()
    c = conn.cursor()
    # MySQL syntax
    c.execute('''SELECT module, DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour, COUNT(*) 
                 FROM module_publications 
                 WHERE timestamp >= NOW() - INTERVAL %s HOUR
                 GROUP BY module, hour 
                 ORDER BY hour ASC''', (hours,))
    data = c.fetchall()
    conn.close()
    return data

def get_all_modules_with_variables():
    """Get all modules with their variables for admin interface."""
    conn = get_db_connection()
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
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM measurements WHERE module=%s AND variable=%s", (module, variable))
    deleted_count = c.rowcount
    conn.commit()
    conn.close()
    return deleted_count

def delete_module_permanently(module):
    """Permanently delete a module and all its variables/measurements."""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Delete from measurements
    c.execute("DELETE FROM measurements WHERE module=%s", (module,))
    measurements_deleted = c.rowcount
    
    # Delete from module_publications
    c.execute("DELETE FROM module_publications WHERE module=%s", (module,))
    publications_deleted = c.rowcount
    
    conn.commit()
    conn.close()
    
    return {
        'measurements': measurements_deleted,
        'publications': publications_deleted
    }

# --- Analysis Functions ---

def get_mqtt_analysis_global():
    """Get global analysis of MQTT messages."""
    conn = get_db_connection()
    c = conn.cursor(dictionary=True)
    
    # Total messages
    c.execute("SELECT COUNT(*) as total FROM mqtt_messages")
    total = c.fetchone()['total']
    
    # Compliance rate
    c.execute("SELECT COUNT(*) as compliant FROM mqtt_messages WHERE is_compliant = 1")
    compliant = c.fetchone()['compliant']
    compliance_rate = (compliant / total * 100) if total > 0 else 0
    
    # Active projects (last 24h)
    c.execute("SELECT COUNT(DISTINCT project) as active_projects FROM mqtt_messages WHERE timestamp >= NOW() - INTERVAL 24 HOUR")
    active_projects = c.fetchone()['active_projects']
    
    conn.close()
    return {
        "total_messages": total,
        "compliance_rate": round(compliance_rate, 1),
        "active_projects": active_projects
    }

def get_mqtt_analysis_projects():
    """Get detailed analysis per project."""
    conn = get_db_connection()
    c = conn.cursor(dictionary=True)
    
    # Get stats per project
    c.execute("""
        SELECT 
            project,
            COUNT(*) as total_msgs,
            SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant_msgs,
            MAX(timestamp) as last_seen,
            COUNT(DISTINCT topic) as unique_topics
        FROM mqtt_messages 
        WHERE project IS NOT NULL AND project != ''
        GROUP BY project
        ORDER BY total_msgs DESC
    """)
    projects = c.fetchall()
    
    results = []
    for p in projects:
        # Calculate score
        # Base: 100
        # Penalty: Non-compliant ratio
        # Penalty: Spam (if > 1000 msgs/hour average? simplified here)
        
        compliance_ratio = p['compliant_msgs'] / p['total_msgs'] if p['total_msgs'] > 0 else 0
        score = 100 * compliance_ratio
        
        # Simple volume check (just for display)
        volume_status = "Normal"
        if p['total_msgs'] > 10000: # Arbitrary threshold
            volume_status = "High"
        
        results.append({
            "name": p['project'],
            "total": p['total_msgs'],
            "compliant": p['compliant_msgs'],
            "compliance_rate": round(compliance_ratio * 100, 1),
            "last_seen": p['last_seen'].isoformat() if p['last_seen'] else "N/A",
            "score": round(score, 0),
            "volume": volume_status
        })
        
    conn.close()
    return results

def get_mqtt_project_details(project_name):
    """Get detailed analysis for a specific project."""
    conn = get_db_connection()
    c = conn.cursor(dictionary=True)
    
    # 1. Error analysis - non-compliant messages
    c.execute("""
        SELECT topic, COUNT(*) as count
        FROM mqtt_messages
        WHERE project = %s AND is_compliant = 0
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
    """, (project_name,))
    errors = c.fetchall()
    
    # 2. Publication frequency - messages per minute over last hour
    c.execute("""
        SELECT 
            DATE_FORMAT(timestamp, '%%Y-%%m-%%d %%H:%%i') as minute,
            COUNT(*) as count
        FROM mqtt_messages
        WHERE project = %s AND timestamp >= NOW() - INTERVAL 1 HOUR
        GROUP BY minute
        ORDER BY minute DESC
    """, (project_name,))
    frequency = c.fetchall()
    
    # Calculate stats
    max_freq = max([f['count'] for f in frequency], default=0)
    avg_freq = sum([f['count'] for f in frequency]) / len(frequency) if frequency else 0
    
    # 3. Topic breakdown by category
    c.execute("""
        SELECT category, COUNT(*) as count
        FROM mqtt_messages
        WHERE project = %s
        GROUP BY category
    """, (project_name,))
    categories = c.fetchall()
    
    # 4. Most active topics
    c.execute("""
        SELECT topic, COUNT(*) as count, MAX(timestamp) as last_seen
        FROM mqtt_messages
        WHERE project = %s
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
    """, (project_name,))
    top_topics = c.fetchall()
    
    # 5. Activity timeline - messages per hour last 24h
    c.execute("""
        SELECT 
            DATE_FORMAT(timestamp, '%%Y-%%m-%%d %%H:00') as hour,
            COUNT(*) as count
        FROM mqtt_messages
        WHERE project = %s AND timestamp >= NOW() - INTERVAL 24 HOUR
        GROUP BY hour
        ORDER BY hour ASC
    """, (project_name,))
    timeline = c.fetchall()
    
    # 6. Overall stats
    c.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant,
            MIN(timestamp) as first_seen,
            MAX(timestamp) as last_seen
        FROM mqtt_messages
        WHERE project = %s
    """, (project_name,))
    stats = c.fetchone()
    
    # 7. Recent messages (last 50)
    c.execute("""
        SELECT topic, payload, timestamp, is_compliant
        FROM mqtt_messages
        WHERE project = %s
        ORDER BY timestamp DESC
        LIMIT 10
    """, (project_name,))
    recent_messages = c.fetchall()
    
    conn.close()
    
    return {
        "project": project_name,
        "stats": stats,
        "errors": errors,
        "frequency": {
            "data": frequency,
            "max": max_freq,
            "avg": round(avg_freq, 1)
        },
        "categories": categories,
        "top_topics": top_topics,
        "timeline": timeline,
        "recent_messages": recent_messages
    }

def cleanup_old_mqtt_messages():
    """Keep only the last 1 million MQTT messages to prevent database bloat."""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Count total messages
        c.execute("SELECT COUNT(*) as total FROM mqtt_messages")
        total = c.fetchone()[0]
        
        if total > 1000000:
            # Delete oldest messages, keeping only the most recent 1M
            messages_to_delete = total - 1000000
            c.execute("""
                DELETE FROM mqtt_messages 
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id FROM mqtt_messages 
                        ORDER BY timestamp ASC 
                        LIMIT %s
                    ) tmp
                )
            """, (messages_to_delete,))
            conn.commit()
            print(f"[MQTT Cleanup] Deleted {messages_to_delete} old messages. Kept last 1M.")
        
        conn.close()
    except Exception as e:
        print(f"[MQTT Cleanup] Error: {e}")

