#!/usr/bin/env python3
"""
Script to populate module_publications table with historical data
for trend visualization in the dashboard.
"""

import sqlite3
from datetime import datetime, timedelta
import random

DB_NAME = "ferme.db"

def populate_publication_trends():
    """Generate hourly publication data for the last 12 hours for each module."""
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Get existing modules from measurements table
    c.execute("SELECT DISTINCT module FROM measurements")
    modules = [row[0] for row in c.fetchall()]
    
    if not modules:
        print("⚠️  No modules found in measurements table. Run populate_db.py first.")
        conn.close()
        return
    
    print(f"📊 Populating publication trends for {len(modules)} modules...")
    
    # Clear existing publication data
    c.execute("DELETE FROM module_publications")
    
    # Generate data for last 12 hours
    now = datetime.now()
    total_inserted = 0
    
    for module in modules:
        # Each module will have different publication patterns
        base_rate = random.randint(5, 30)  # Base publications per hour
        
        for hour_offset in range(12, 0, -1):
            hour_time = now - timedelta(hours=hour_offset)
            
            # Add some variation to make curves interesting
            variation = random.randint(-5, 10)
            num_publications = max(1, base_rate + variation)
            
            # Insert individual publication records for this hour
            for _ in range(num_publications):
                # Spread publications across the hour
                minute_offset = random.randint(0, 59)
                timestamp = hour_time.replace(minute=minute_offset, second=0, microsecond=0)
                
                c.execute(
                    "INSERT INTO module_publications (module, timestamp) VALUES (?, ?)",
                    (module, timestamp)
                )
                total_inserted += 1
    
    conn.commit()
    conn.close()
    
    print(f"✅ Successfully inserted {total_inserted} publication records")
    print(f"📈 Modules: {', '.join(modules)}")
    print(f"⏰ Time range: {now - timedelta(hours=12)} to {now}")
    print("\n🎯 Refresh the dashboard to see the trend curves!")

if __name__ == "__main__":
    populate_publication_trends()
