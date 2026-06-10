import http.server
import socketserver
import os
import webbrowser
import sys

# Port number to host the server
PORT = 8000

# Base directory is the folder of this script
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the pomodoro-timer directory specifically
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Override to print log entries clearly to stdout
        sys.stdout.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))
        sys.stdout.flush()

def main():
    # Force socket reuse so restarting doesn't raise "Address already in use" errors immediately
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"==================================================")
            print(f" Локальный сервер FocusTime запущен успешно!")
            print(f" Адрес: http://localhost:{PORT}")
            print(f" Корневая папка: {DIRECTORY}")
            print(f"==================================================")
            print(" Нажмите Ctrl+C в терминале для остановки сервера.\n")
            
            # Open the web page automatically in the user's default browser
            webbrowser.open(f"http://localhost:{PORT}")
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Инфо] Сервер остановлен пользователем.")
    except Exception as e:
        print(f"\n[Ошибка] Не удалось запустить сервер: {e}")

if __name__ == "__main__":
    main()
