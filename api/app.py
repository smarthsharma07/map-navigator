import subprocess
import json
import os
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='../frontend')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXECUTABLE = os.path.join(BASE_DIR, 'backend', 'map_navigator.exe')

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/locations', methods=['GET'])
def get_locations():
    try:
        result = subprocess.run([EXECUTABLE, 'locations'], capture_output=True, text=True, check=True)
        return jsonify(json.loads(result.stdout))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/navigate', methods=['GET'])
def get_navigation():
    src = request.args.get('src')
    dest = request.args.get('dest')

    if src is None or dest is None:
        return jsonify({"error": "Missing src or dest parameter"}), 400

    try:
        result = subprocess.run([EXECUTABLE, 'path', src, dest], capture_output=True, text=True, check=True)
        return jsonify(json.loads(result.stdout))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Map Navigator Server at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
