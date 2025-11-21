import paho.mqtt.client as mqtt
import time
import json
import random

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")

client = mqtt.Client()
client.on_connect = on_connect
client.connect("global_mqtt", 1883, 60)

topics = [
    "bzh/mecatro/dashboard/test_module/temperature",
    "bzh/mecatro/dashboard/test_module/humidity",
    "bzh/mecatro/dashboard/another_module/pressure"
]

client.loop_start()

for i in range(10):
    topic = random.choice(topics)
    val_type = random.choice(["float", "text"])
    
    if val_type == "float":
        payload = str(random.randint(20, 30))
    else:
        payload = random.choice(["ON", "OFF", "ERROR", "High"])
        
    print(f"Publishing {payload} to {topic}")
    client.publish(topic, payload)
    time.sleep(1)

client.loop_stop()
