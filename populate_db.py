import sqlite3
import random
from datetime import datetime, timedelta

DB_NAME = 'ferme.db'

def populate():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    print("Populating database with historical data...")
    
    # Clear existing data to avoid duplicates if run multiple times (optional, but good for clean state)
    # c.execute("DELETE FROM measurements")
    # c.execute("DELETE FROM message_stats")
    
    # Generate data for the last 7 days (more data for richer charts)
    now = datetime.now()
    
    modules = ['test_module', 'another_module', 'sensor_hub']
    variables = ['temperature', 'humidity', 'pressure', 'light_level']
    
    # 1. Measurements (every 5 minutes for more granularity)
    current_time = now - timedelta(days=7)
    while current_time <= now:
        for module in modules:
            for variable in variables:
                # Generate realistic-ish values
                if variable == 'temperature':
                    val = 20 + random.uniform(-5, 10) # 15-30
                elif variable == 'humidity':
                    val = 50 + random.uniform(-20, 20) # 30-70
                elif variable == 'pressure':
                    val = 1013 + random.uniform(-10, 10)
                elif variable == 'light_level':
                    # Simpler day/night cycle
                    hour = current_time.hour
                    if 6 <= hour <= 20:
                        val = 800 + random.uniform(-100, 200)
                    else:
                        val = 0 + random.uniform(0, 10)
                
                # Occasional text value
                if random.random() < 0.01:
                    val = random.choice(["ERROR", "OFF", "CALIBRATING"])
                else:
                    val = round(val, 2)
                
                c.execute("INSERT INTO measurements (module, variable, value, timestamp) VALUES (?, ?, ?, ?)",
                          (module, variable, val, current_time))
        
        current_time += timedelta(minutes=5)
        
    # 2. Message Stats (per minute)
    # We'll just generate stats for the last 120 minutes for the chart
    current_time = now - timedelta(minutes=120)
    while current_time <= now:
        # Random count between 5 and 50
        count = random.randint(5, 50)
        for _ in range(count):
            c.execute("INSERT INTO message_stats (timestamp) VALUES (?)", (current_time,))
        current_time += timedelta(minutes=1)

    conn.commit()
    conn.close()
    print("Database populated successfully!")

if __name__ == '__main__':
    populate()
