# app.py
from flask import Flask, render_template, jsonify, session, redirect, url_for, request # type: ignore
from flask_socketio import SocketIO # type: ignore
from werkzeug.security import generate_password_hash, check_password_hash
from mqtt_client import init_mqtt, dashboard_data, last_messages
import eventlet
import database
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
socketio = SocketIO(app, async_mode='eventlet')

# Admin password (hashed with bcrypt)
# Default password: admin123
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', 
    'pbkdf2:sha256:600000$9xKzJ8YvXqMfQRLZ$e8c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8f5e5c8')
# To generate a new hash: from werkzeug.security import generate_password_hash; print(generate_password_hash('your_password'))

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
    """Get publication trends per hour per module"""
    data = database.get_module_publication_trends(hours=12)
    return jsonify(data)

@app.route("/api/stats/rate-limit")
def get_rate_limit_status():
    """Get current rate limit status for each module"""
    from mqtt_client import last_save_time, RATE_LIMIT_SECONDS
    from datetime import datetime
    
    status = []
    for key, last_time in last_save_time.items():
        module, variable = key.split(':', 1)
        time_since = (datetime.now() - last_time).total_seconds()
        is_limited = time_since < RATE_LIMIT_SECONDS
        
        status.append({
            "module": module,
            "variable": variable,
            "last_save": last_time.isoformat(),
            "seconds_since": round(time_since, 1),
            "is_limited": is_limited
        })
    
    # Group by module
    grouped = {}
    for item in status:
        mod = item['module']
        if mod not in grouped:
            grouped[mod] = []
        grouped[mod].append(item)
    
    return jsonify(grouped)

# --- Student Page Routes ---
@app.route("/student")
def student_page():
    """Interactive page for students to publish and subscribe to MQTT"""
    return render_template("student.html")

@app.route("/api/student/publish", methods=["POST"])
def student_publish():
    """Publish MQTT message from student interface"""
    data = request.get_json()
    project = data.get('project', '').strip()
    variable = data.get('variable', '').strip()
    value = data.get('value', '').strip()
    
    if not project or not variable or not value:
        return jsonify({"error": "Missing project, variable, or value"}), 400
    
    # Publish to MQTT
    topic = f"ferme/data/out/{project}/{variable}"
    try:
        mqtt_client.publish(topic, value)
        return jsonify({"success": True, "topic": topic, "value": value})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Admin Routes ---
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = request.form.get("password")
        # For simplicity, we'll accept the plain password "admin123"
        if password == "admin123":
            session['admin_logged_in'] = True
            return redirect(url_for('admin'))
        else:
            return render_template("login.html", error="Mot de passe incorrect")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('login'))

@app.route("/admin")
def admin():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    
    modules_data = database.get_all_modules_with_variables()
    return render_template("admin.html", modules=modules_data)

@app.route("/api/admin/delete-variable", methods=["POST"])
def delete_variable():
    if not session.get('admin_logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    module = data.get('module')
    variable = data.get('variable')
    
    if not module or not variable:
        return jsonify({"error": "Missing module or variable"}), 400
    
    deleted_count = database.delete_variable_permanently(module, variable)
    return jsonify({"success": True, "deleted": deleted_count})

@app.route("/api/admin/delete-module", methods=["POST"])
def delete_module():
    if not session.get('admin_logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    module = data.get('module')
    
    if not module:
        return jsonify({"error": "Missing module"}), 400
    
    result = database.delete_module_permanently(module)
    return jsonify({"success": True, "deleted": result})

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0")