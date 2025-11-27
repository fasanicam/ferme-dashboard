import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("I'm connected!")

@sio.event
def connect_error(data):
    print("The connection failed!")

@sio.event
def disconnect():
    print("I'm disconnected!")

def main():
    try:
        # Attempt to connect to the local server
        # Note: The server must be running. I'll assume it's running on localhost:5000 or similar.
        # If the user is running it via a command, I might need to know the port.
        # The logs showed 'wss://ferme.bzh.dev.icam.school', which implies it's deployed.
        # But I am editing local files. I should test against localhost if the server is running locally.
        # If not, I can't really test it without starting the server.
        # I'll try to connect to localhost:5000.
        sio.connect('http://localhost:5000', transports=['websocket', 'polling'])
        time.sleep(2)
        sio.disconnect()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    main()
