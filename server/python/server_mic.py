from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import threading
import json
import time
from audio_processor import AudioProcessor

class StreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/sensors':
            self.send_response(200)
            self.send_header('Content-type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                while True:
                    motion_data = 1
                    light_data = 1.2
                    self.wfile.write(f"data: {float(motion_data)},{float(light_data)}\n\n".encode())
                    time.sleep(1.)
            except Exception as e:
                print(f"Client disconnected: {e}")
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                while True:
                    rms_value = processor.get_rms()
                    avg_rms_value = processor.current_avg_rms
                    # avg_rms_db_value = processor.current_avg_rms_db
                    if rms_value is not None:
                        # self.wfile.write(f"data: {json.dumps({'rms': float(rms_value), 'arms': float(avg_rms_value)})}\n\n".encode())
                        self.wfile.write(f"data: {float(avg_rms_value)},{float(rms_value)}\n\n".encode())
                    time.sleep(0.01)
            except Exception as e:
                print(f"Client disconnected: {e}")
        elif self.path == '/start':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            if not processor.running:
                processor.running = True
                processor_thread = threading.Thread(target=processor.start)
                processor_thread.start()
            self.wfile.write(b'AudioProcessor started')
        elif self.path == '/stop':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            if processor.running:
                processor.stop()
            self.wfile.write(b'AudioProcessor stopped')
        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            status = {
                'running': processor.running,
                'current_rms': float(processor.get_rms()) if processor.get_rms() is not None else None
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

def run_server():
    server_address = ('', 8081)
    httpd = ThreadedHTTPServer(server_address, StreamHandler)
    print('Starting server on port 8081...')
    httpd.serve_forever()

if __name__ == "__main__":
    processor = AudioProcessor()
    # processor_thread = threading.Thread(target=processor.start)
    # processor_thread.start()
    print('AudioProcessor started')
    run_server()