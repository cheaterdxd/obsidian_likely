from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import re

app = Flask(__name__)
NOTES_DIR = os.path.join(os.getcwd(), 'notes')

# Ensure notes directory exists
if not os.path.exists(NOTES_DIR):
    os.makedirs(NOTES_DIR)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/files', methods=['GET'])
def list_files():
    files = [f for f in os.listdir(NOTES_DIR) if f.endswith('.md')]
    return jsonify(files)

@app.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    filepath = os.path.join(NOTES_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'content': content})
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/file', methods=['POST'])
def save_file():
    data = request.json
    filename = data.get('filename')
    content = data.get('content')

    if not filename:
        return jsonify({'error': 'Filename required'}), 400

    filepath = os.path.join(NOTES_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return jsonify({'success': True})

@app.route('/api/create', methods=['POST'])
def create_file():
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'Filename required'}), 400

    if not filename.endswith('.md'):
        filename += '.md'

    filepath = os.path.join(NOTES_DIR, filename)
    if os.path.exists(filepath):
        return jsonify({'error': 'File already exists'}), 400

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('')

    return jsonify({'success': True, 'filename': filename})

@app.route('/api/graph', methods=['GET'])
def get_graph():
    nodes = []
    edges = []
    files = [f for f in os.listdir(NOTES_DIR) if f.endswith('.md')]

    # Create nodes
    for i, filename in enumerate(files):
        nodes.append({'id': i, 'label': filename[:-3], 'filename': filename})

    # Create edges
    for i, filename in enumerate(files):
        filepath = os.path.join(NOTES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find links like [[Link]]
        links = re.findall(r'\[\[(.*?)\]\]', content)
        for link in links:
            target = link.split('|')[0] # Handle alias like [[Link|Alias]]
            # Find target index
            for j, other_file in enumerate(files):
                if other_file[:-3] == target:
                    edges.append({'from': i, 'to': j})
                    break

    return jsonify({'nodes': nodes, 'edges': edges})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
