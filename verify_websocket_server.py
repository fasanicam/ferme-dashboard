from app import app, socketio

def test_connect():
    client = socketio.test_client(app)
    assert client.is_connected()
    print("SocketIO test client connected successfully!")
    client.disconnect()

if __name__ == '__main__':
    try:
        test_connect()
    except Exception as e:
        print(f"Test failed: {e}")
