# 🌱 Ferme Dashboard

Dashboard en temps réel pour la surveillance de capteurs IoT via MQTT, développé avec Flask et Chart.js.

![Dashboard](https://img.shields.io/badge/Flask-2.0+-green.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Fonctionnalités

- 📊 **Visualisation en temps réel** : Mise à jour instantanée via WebSockets (Flask-SocketIO)
- 📈 **Graphiques interactifs** : Historique des données avec Chart.js
- 💾 **Persistance des données** : Base de données SQLite pour l'historique
- 🔄 **Reconnexion automatique** : Gestion robuste des déconnexions MQTT
- 📝 **Rotation des logs** : Gestion automatique de la taille des fichiers logs
- 🎨 **Interface moderne** : Design responsive avec Tailwind CSS
- 🔢 **Support données mixtes** : Gestion des valeurs numériques et textuelles

## 🚀 Installation

### Prérequis

- Python 3.8+
- Docker (optionnel, pour MQTT broker)
- Git

### Installation locale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/fasanicam/ferme-dashboard.git
   cd ferme-dashboard
   ```

2. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurer MQTT**
   
   Assurez-vous d'avoir un broker MQTT accessible. Par défaut, l'application se connecte à `global_mqtt:1883`.

4. **Lancer l'application**
   ```bash
   python app.py
   ```

5. **Accéder au dashboard**
   
   Ouvrez votre navigateur à l'adresse : `http://localhost:5000`

### Installation avec Docker

```bash
docker build -t ferme-dashboard .
docker run -p 5000:5000 --name ferme-app ferme-dashboard
```

## 📊 Utilisation

### Format des topics MQTT

L'application écoute les topics au format :
```
bzh/mecatro/dashboard/<module>/<variable>
```

**Exemple :**
```
bzh/mecatro/dashboard/serre/temperature → 23.5
bzh/mecatro/dashboard/serre/humidite → 65
bzh/mecatro/dashboard/pompe/etat → ON
```

### Générer des données de test

Pour peupler la base de données avec des données historiques :

```bash
python populate_db.py
```

Pour envoyer des messages MQTT de test :

```bash
python verify_mqtt.py
```

## 🏗️ Architecture

```
ferme-dashboard/
├── app.py                 # Application Flask principale
├── mqtt_client.py         # Client MQTT et gestion des messages
├── database.py            # Gestion SQLite
├── templates/
│   └── dashboard.html     # Interface web
├── requirements.txt       # Dépendances Python
├── populate_db.py         # Script de génération de données
└── verify_mqtt.py         # Script de test MQTT
```

## 🔌 API Endpoints

- `GET /` - Dashboard principal
- `GET /api/history/<module>/<variable>` - Historique d'une variable (100 dernières valeurs)
- `GET /api/stats/messages` - Statistiques des messages (60 dernières minutes)

## 🛠️ Technologies

- **Backend** : Flask, Flask-SocketIO, Paho-MQTT
- **Frontend** : HTML5, Tailwind CSS, Chart.js
- **Base de données** : SQLite
- **WebSockets** : Socket.IO (eventlet)
- **Logging** : RotatingFileHandler

## 📝 Configuration

### Variables d'environnement (à venir)

Pour une configuration personnalisée, vous pourrez créer un fichier `.env` :

```env
MQTT_BROKER=localhost
MQTT_PORT=1883
FLASK_SECRET_KEY=your-secret-key
DATABASE_PATH=ferme.db
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit vos changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👤 Auteur

**fasanicam**

- GitHub: [@fasanicam](https://github.com/fasanicam)

## 🙏 Remerciements

- Flask et la communauté Python
- Chart.js pour les graphiques
- Paho-MQTT pour la communication IoT

---

⭐ Si ce projet vous a été utile, n'hésitez pas à lui donner une étoile !
