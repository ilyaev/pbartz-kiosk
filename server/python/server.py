from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import threading
import json
import time
from smbus2 import SMBus

I2C_BUS = 1
BH1750_ADDR = 0x23  # Default address (0x5C if ADDR is pulled high)

class StreamHandler(BaseHTTPRequestHandler):

    def read_light(self, bus, address):
        try:
            # Start one-time measurement in high-res mode
            bus.write_byte(address, 0x20)
            time.sleep(0.18)  # Wait for measurement (up to 180ms)

            # Read 2 bytes (MSB first)
            data = bus.read_i2c_block_data(address, 0x00, 2)
            lux = (data[0] << 8 | data[1]) / 1.2
            return lux
        except OSError as e:
            print(f"Error: {e}")
            return None

    def do_GET(self):
        if self.path == '/sensors':
            self.send_response(200)
            self.send_header('Content-type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                while True:
                    motion_data = -1
                    light_data = -1
                    if bus is not None:
                       lux = self.read_light(bus, BH1750_ADDR)
                       if lux is not None:
                           light_data = lux
                    self.wfile.write(f"data: {float(motion_data)},{float(light_data)}\n\n".encode())
                    time.sleep(1.)
            except Exception as e:
                print(f"Client disconnected: {e}")
        else:
            self.send_response(404)
            self.end_headers()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

def run_server():
    server_address = ('', 8083)
    httpd = ThreadedHTTPServer(server_address, StreamHandler)
    print('Starting server on port 8083...')
    httpd.serve_forever()

if __name__ == "__main__":
    try:
        bus = SMBus(I2C_BUS)
        print("Connected to I2C bus.")
    except Exception as e:
        bus = None
        print(f"Failed to connect to I2C bus: {e}")
    run_server()