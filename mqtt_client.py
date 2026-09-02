import logging
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt  # type: ignore
from collections import deque, defaultdict
import time
import eventlet

dashboard_data = {}
last_messages = deque(maxlen=100)  # Stocke les 100 derniers messages

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

# Global socketio instance
_socketio = None

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("✅ Connecté au broker MQTT: mqtt.dev.icam.school")
        # Subscribe to ALL bzh/mecatro traffic for complete monitoring
        client.subscribe("bzh/mecatro/#")
        logging.info("📡 Abonné au topic: bzh/mecatro/# (monitoring complet)")
    else:
        logging.error("❌ Échec de connexion au broker MQTT, code: %s. Tentative de reconnexion...", rc)
        try:
            client.reconnect()
        except Exception as e:
            logging.error("Erreur lors de la reconnexion : %s", e)

def on_disconnect(client, userdata, rc):
    logging.warning("Déconnecté du broker MQTT (code %s). Tentative de reconnexion...", rc)
    if rc != 0:
        try:
            client.reconnect()
        except Exception as e:
            logging.error("Erreur lors de la reconnexion : %s", e)

def on_message(client, userdata, msg):
    global _socketio
    try:
        topic = msg.topic
        payload = msg.payload.decode()
        logging.info("Message reçu sur %s: %s", topic, payload)

        # --- Analysis & Logging ---
        parts = topic.split('/')
        project = None
        category = 'other'
        is_compliant = False
        error_reason = None
        
        # Check structure according to the IoT Guide:
        # Dashboard: bzh/mecatro/dashboard/<NOM_PROJET>/<NOM_VARIABLE> = EXACTLY 5 parts
        # Ambiance:  bzh/mecatro/ambiance/<GROUPE>/<GRANDEUR> = EXACTLY 5 parts
        # Private:   bzh/mecatro/prive/<GROUPE>/capteurs/<NOM> = EXACTLY 6 parts
        #            bzh/mecatro/prive/<GROUPE>/actionneurs/<NOM> = EXACTLY 6 parts
        
        if len(parts) >= 3 and parts[0] == 'bzh' and parts[1] == 'mecatro':
            if parts[2] == 'dashboard':
                category = 'dashboard'
                if len(parts) >= 4:
                    project = parts[3]
                
                # STRICT CHECK: Dashboard must have EXACTLY 5 parts
                if len(parts) == 5:
                    is_compliant = True
                elif len(parts) > 5:
                    # Too many levels (e.g., /air/temperature instead of /temperature)
                    is_compliant = False
                    error_reason = f"Trop de niveaux ({len(parts)} au lieu de 5). Format attendu: bzh/mecatro/dashboard/<PROJET>/<VARIABLE>"
                    logging.warning(f"Topic NON CONFORME: {topic} - {error_reason}")
                else:
                    # Not enough parts
                    is_compliant = False
                    error_reason = f"Pas assez de niveaux ({len(parts)}). Format attendu: bzh/mecatro/dashboard/<PROJET>/<VARIABLE>"
                    logging.warning(f"Topic NON CONFORME: {topic} - {error_reason}")

            elif parts[2] == 'ambiance':
                category = 'ambiance'
                if len(parts) >= 4:
                    project = parts[3]
                if len(parts) == 5:
                    is_compliant = True
                else:
                    is_compliant = False
                    error_reason = f"Nombre de niveaux incorrect ({len(parts)} au lieu de 5). Format attendu: bzh/mecatro/ambiance/<GROUPE>/<GRANDEUR>"
                    logging.warning(f"Topic NON CONFORME: {topic} - {error_reason}")
                    
            elif parts[2] in ['prive', 'projets']:
                if len(parts) >= 4:
                    project = parts[3]
                    
                # STRICT CHECK: Private must have EXACTLY 6 parts with capteur(s)/actionneur(s) at position 4
                is_sensor_or_actuator = len(parts) >= 5 and parts[4] in ['capteur', 'capteurs', 'actionneur', 'actionneurs']
                if len(parts) == 6 and is_sensor_or_actuator:
                    category = parts[4] if parts[4].endswith('s') else f"{parts[4]}s"
                    is_compliant = True
                elif len(parts) >= 5 and is_sensor_or_actuator:
                    category = parts[4]
                    is_compliant = False
                    error_reason = f"Nombre de niveaux incorrect ({len(parts)} au lieu de 6). Attendu: bzh/mecatro/prive/<GROUPE>/{parts[4]}/<NOM>"
                    logging.warning(f"Topic NON CONFORME: {topic} - {error_reason}")
                else:
                    category = 'project_structure_error'
                    is_compliant = False
                    error_reason = "Structure invalide pour prive (attendu: .../prive/<GROUPE>/capteur(s)|actionneur(s)/<NOM>)"
                    logging.warning(f"Topic NON CONFORME: {topic} - {error_reason}")
        
        # Only log messages from bzh/mecatro hierarchy
        if len(parts) >= 2 and parts[0] == 'bzh' and parts[1] == 'mecatro':
            database.log_mqtt_message(topic, payload, project, category, is_compliant)
        
        # Cleanup old messages periodically (every 1000 messages)
        # This keeps the database size under control
        if hasattr(on_message, 'message_count'):
            on_message.message_count += 1
        else:
            on_message.message_count = 1
            
        if on_message.message_count % 1000 == 0:
            database.cleanup_old_mqtt_messages()
        # --------------------------
        
        # Log message receipt for stats
        database.log_message_receipt()
        
        timestamp = datetime.now().isoformat(timespec='seconds') + 'Z'
        
        # Ajouter le message à la liste des derniers messages
        message_data = {
            "topic": topic,
            "payload": payload,
            "timestamp": timestamp
        }
        last_messages.appendleft(message_data)

        # Emit new message event to all clients
        if _socketio:
            _socketio.emit('new_message', message_data, namespace='/')
            eventlet.sleep(0)  # Yield to eventlet to process the emit
            logging.info("✉️ Event 'new_message' emitted to all clients for topic: %s", topic)
        else:
            logging.warning("⚠️ SocketIO not initialized!")
        
        # Parse topic: bzh/mecatro/dashboard/<project>/<variable>
        parts = topic.split('/')
        if len(parts) < 5 or parts[0] != 'bzh' or parts[1] != 'mecatro' or parts[2] != 'dashboard':
            logging.warning("Topic malformé (attendu: bzh/mecatro/dashboard/<projet>/<variable>): %s", topic)
            return

        module = parts[3]  # project name
        variable = parts[4]  # variable name
        
        # Track publication count per module (in-memory counter)
        module_message_count[module] += 1
        
        # Log to database for trend tracking
        database.log_module_publication(module)
        
        # Si le payload est vide, supprimer la variable
        if not payload:
            if module in dashboard_data and variable in dashboard_data[module]:
                del dashboard_data[module][variable]
                # Si le module n'a plus de variables, le supprimer aussi
                if not dashboard_data[module]:
                    del dashboard_data[module]
                # Emit deletion event to all clients
                if _socketio:
                    _socketio.emit('delete_data', {'module': module, 'variable': variable}, namespace='/')
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
        
        # Emit update event to all clients (always update UI, even if not saving to DB)
        if _socketio:
            _socketio.emit('update_data', {
                'module': module, 
                'variable': variable, 
                'value': payload,
                'timestamp': timestamp
            }, namespace='/')
            eventlet.sleep(0)  # Yield to eventlet to process the emit
            logging.info("📡 Event 'update_data' emitted to all clients: %s/%s = %s", module, variable, payload)
        else:
            logging.warning("⚠️ SocketIO not initialized!")
    except Exception as e:
        logging.error("Erreur lors du traitement du message MQTT : %s", e)

def init_mqtt(socketio=None):
    global _socketio
    _socketio = socketio
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    # client.username_pw_set('admin', 'admin@icam')
    try:
        client.connect("global_mqtt", 1883, 60)
        client.loop_start()
        logging.info("🚀 Client MQTT démarré et connecté à mqtt.dev.icam.school")
    except Exception as e:
        logging.error("❌ Erreur lors de la connexion au broker MQTT : %s", e)
    return client
