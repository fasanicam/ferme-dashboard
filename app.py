# app.py
from flask import Flask, render_template, jsonify # type: ignore
from flask_socketio import SocketIO # type: ignore
from mqtt_client import init_mqtt, dashboard_data, last_messages
import eventlet
import database

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='eventlet')

# Initialize DB
database.init_db()

# Initialize MQTT with SocketIO instance
mqtt_client = init_mqtt(socketio)

from datetime import datetime

def delay_humain(timestamp_iso):
    try:
        dt = datetime.fromisoformat(timestamp_iso)
        delta = datetime.now() - dt
        secondes = int(delta.total_seconds())
        minutes = secondes // 60
        heures = minutes // 60
        jours = heures // 24
        semaines = jours // 7
        mois = jours // 30

        if secondes < 10:
            return "il y a quelques secondes"
        elif secondes < 60:
            return f"il y a {secondes} secondes"
        elif minutes < 60:
            return f"il y a {minutes} minutes"
        elif heures < 24:
            return f"il y a {heures} heures"
        elif jours < 7:
            return f"il y a {jours} jours"
        elif semaines < 5:
            return f"il y a {semaines} semaines"
        else:
            return f"il y a {mois} mois"
    except Exception as e:
        return "inconnu : " + str(timestamp_iso)


@app.route("/")
def dashboard():
    return render_template("dashboard.html", dashboard=dashboard_data, delay=delay_humain, messages=last_messages)

@app.route("/api/history/<module>/<variable>")
def get_history(module, variable):
    data = database.get_history(module, variable)
    return jsonify(data)

@app.route("/api/stats/messages")
def get_message_stats():
    data = database.get_message_stats()
    return jsonify(data)

@app.route("/api/stats/publications")
def get_publication_stats():
    """Get publication count per module for monitoring"""
    from mqtt_client import module_message_count
    data = [{"module": module, "count": count} for module, count in module_message_count.items()]
    # Sort by count descending to show most active modules first
    data.sort(key=lambda x: x['count'], reverse=True)
    return jsonify(data)

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0")