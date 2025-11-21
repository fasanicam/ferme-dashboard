"""
Script pour générer des données historiques directement dans la base de données
en utilisant les modules/variables actuellement affichés sur le dashboard.
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_NAME = 'ferme.db'

def populate_with_current_modules():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    print("Generating historical data for current dashboard modules...")
    
    # Get current modules and variables from the database
    c.execute("SELECT DISTINCT module, variable FROM measurements ORDER BY timestamp DESC LIMIT 100")
    existing = c.fetchall()
    
    # If we have existing data, use those modules/variables
    if existing:
        modules_vars = {}
        for module, variable in existing:
            if module not in modules_vars:
                modules_vars[module] = []
            if variable not in modules_vars[module]:
                modules_vars[module].append(variable)
        
        print(f"Found existing modules: {list(modules_vars.keys())}")
    else:
        # Default fallback
        modules_vars = {
            'test_module': ['temperature', 'humidity'],
            'another_module': ['pressure']
        }
        print("Using default modules (no existing data found)")
    
    now = datetime.now()
    
    # Generate 7 days of data, every 5 minutes
    current_time = now - timedelta(days=7)
    count = 0
    
    while current_time <= now:
        for module, variables in modules_vars.items():
            for variable in variables:
                # Generate realistic values based on variable name
                if 'temp' in variable.lower():
                    val = 20 + random.uniform(-5, 10)  # 15-30°C
                elif 'hum' in variable.lower():
                    val = 50 + random.uniform(-20, 20)  # 30-70%
                elif 'press' in variable.lower():
                    val = 1013 + random.uniform(-10, 10)  # atmospheric pressure
                elif 'light' in variable.lower():
                    hour = current_time.hour
                    if 6 <= hour <= 20:
                        val = 800 + random.uniform(-100, 200)
                    else:
                        val = 0 + random.uniform(0, 10)
                else:
                    val = random.uniform(0, 100)  # generic value
                
                # Occasional text value (1% chance)
                if random.random() < 0.01:
                    val = random.choice(["ERROR", "OFF", "CALIBRATING"])
                else:
                    val = round(val, 2)
                
                c.execute("INSERT INTO measurements (module, variable, value, timestamp) VALUES (?, ?, ?, ?)",
                          (module, variable, val, current_time))
                count += 1
        
        current_time += timedelta(minutes=5)
    
    # Generate message stats for the last 2 hours
    current_time = now - timedelta(minutes=120)
    while current_time <= now:
        count_msgs = random.randint(5, 50)
        for _ in range(count_msgs):
            c.execute("INSERT INTO message_stats (timestamp) VALUES (?)", (current_time,))
        current_time += timedelta(minutes=1)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Successfully generated {count} measurement records!")
    print(f"📊 Charts will now show 7 days of history")

if __name__ == '__main__':
    populate_with_current_modules()
