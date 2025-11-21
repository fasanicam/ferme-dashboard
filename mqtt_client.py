import logging
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt  # type: ignore
from collections import deque, defaultdict
import time

dashboard_data = {}
last_messages = deque(maxlen=10)  # Stocke les 10 derniers messages

# Rate limiting: track last message time per module/variable
last_save_time = defaultdict(lambda: datetime.min)
last_value_cache = {}  # Cache to detect duplicate values
RATE_LIMIT_SECONDS = 5  # Minimum 5 seconds between database saves for same variable

# Publication rate monitoring: track message count per module
module_message_count = defaultdict(int)

from logging.handlers import RotatingFileHandler
import database

# Logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        RotatingFileHandler("dashboard.log", maxBytes=1_000_000, backupCount=5),
        logging.StreamHandler()
    ]
)

def on_connect(client, userdata, flags, rc):
    logging.info("Connecté au broker MQTT avec le code %s", rc)
    client.subscribe("bzh/mecatro/#")  # Subscribe à tous les topics sous bzh/mecatro

def on_disconnect(client, userdata, rc):
    logging.warning("Déconnecté du broker MQTT (code %s). Tentative de reconnexion...", rc)
    if rc != 0:
        try:
            client.reconnect()
        except Exception as e:
            logging.error("Erreur lors de la reconnexion : %s", e)

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = msg.payload.decode()
        logging.info("Message reçu sur %s: %s", topic, payload)
        
        # Log message receipt for stats
        database.log_message_receipt()
        
        timestamp = datetime.now().isoformat(timespec='seconds')
        
        # Ajouter le message à la liste des derniers messages
        message_data = {
            "topic": topic,
            "payload": payload,
            "timestamp": timestamp
        }
        last_messages.appendleft(message_data)

        # Emit new message event
        if hasattr(client, 'socketio'):
            client.socketio.emit('new_message', message_data)

        parts = topic.split('/')
        
        # Vérifie si le topic commence par bzh/mecatro/dashboard
        if not topic.startswith("bzh/mecatro/dashboard/"):
            return
            
        if len(parts) < 5:
            return

        module, variable = parts[3], parts[4]
        
        # Track publication count per module
        module_message_count[module] += 1
        
        # Si le payload est vide, supprimer la variable
        if not payload:
            if module in dashboard_data and variable in dashboard_data[module]:
                del dashboard_data[module][variable]
                # Si le module n'a plus de variables, le supprimer aussi
                if not dashboard_data[module]:
                    del dashboard_data[module]
                
                # Emit delete event
                if hasattr(client, 'socketio'):
                    client.socketio.emit('delete_data', {'module': module, 'variable': variable})
            return

        # Ajouter/mettre à jour la variable avec un payload non vide
        if module not in dashboard_data:
            dashboard_data[module] = {}

        dashboard_data[module][variable] = {
            "valeur": payload,
            "derniere_maj": timestamp
        }
        
        # Rate limiting for database saves
        key = f"{module}:{variable}"
        now = datetime.now()
        time_since_last_save = (now - last_save_time[key]).total_seconds()
        
        # Check if value has changed (skip duplicates)
        value_changed = last_value_cache.get(key) != payload
        
        # Save to database only if:
        # 1. Enough time has passed (rate limit) OR
        # 2. Value has changed significantly
        should_save = time_since_last_save >= RATE_LIMIT_SECONDS or value_changed
        
        if should_save:
            database.save_measurement(module, variable, payload)
            last_save_time[key] = now
            last_value_cache[key] = payload
        else:
            logging.debug(f"Skipped DB save for {key} (rate limited or duplicate)")
        
        # Emit update event (always update UI, even if not saving to DB)
        if hasattr(client, 'socketio'):
            client.socketio.emit('update_data', {
                'module': module, 
                'variable': variable, 
                'value': payload,
                'timestamp': timestamp
            })
    except Exception as e:
        logging.error("Erreur lors du traitement du message MQTT : %s", e)

def init_mqtt(socketio=None):
    client = mqtt.Client()
    if socketio:
        client.socketio = socketio
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    # client.username_pw_set('admin', 'admin@icam')
    try:
        client.connect("global_mqtt", 1883, 60)
        # client.connect("broker.emqx.io", 1883, 60)
        client.loop_start()
    except Exception as e:
        logging.error("Impossible de se connecter au broker MQTT : %s", e)
    return client
