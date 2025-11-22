let currentFile = null;
let network = null;

document.addEventListener('DOMContentLoaded', () => {
    loadFileList();
    setupEventListeners();

    // Setup custom renderer for Wiki Links [[Link]]
    const renderer = new marked.Renderer();
    const originalLink = renderer.link;

    // We need to preprocess wiki links because marked doesn't support them natively
    // However, a simple regex replace before passing to marked is easier
});

function setupEventListeners() {
    document.getElementById('new-file-btn').addEventListener('click', createNewFile);
    document.getElementById('save-btn').addEventListener('click', saveCurrentFile);

    document.getElementById('markdown-editor').addEventListener('input', () => {
        updatePreview();
    });
}

function loadFileList() {
    fetch('/api/files')
        .then(response => response.json())
        .then(files => {
            const list = document.getElementById('file-list');
            list.innerHTML = '';
            files.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file;
                li.onclick = () => loadFile(file);
                if (currentFile === file) li.classList.add('active');
                list.appendChild(li);
            });
        });
}

function loadFile(filename) {
    currentFile = filename;

    // Update UI active state
    document.querySelectorAll('#file-list li').forEach(li => {
        li.classList.remove('active');
        if (li.textContent === filename) li.classList.add('active');
    });

    document.getElementById('current-file-name').textContent = filename;

    fetch(`/api/file/${filename}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('markdown-editor').value = data.content;
            updatePreview();
        });
}

function saveCurrentFile() {
    if (!currentFile) return;

    const content = document.getElementById('markdown-editor').value;

    fetch('/api/file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filename: currentFile,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Flash button or something
            const btn = document.getElementById('save-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Saved!';
            setTimeout(() => btn.textContent = originalText, 2000);
            // Refresh graph as links might have changed
            if (document.getElementById('graph-view').style.display === 'flex') {
                loadGraph();
            }
        }
    });
}

function createNewFile() {
    const filename = prompt('Enter file name:');
    if (!filename) return;

    fetch('/api/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadFileList();
            loadFile(data.filename);
        } else {
            alert(data.error);
        }
    });
}

function updatePreview() {
    const content = document.getElementById('markdown-editor').value;

    // Convert [[WikiLinks]] to standard Markdown links [Link](Link) (or handle them specially)
    // For this simple clone, we will make them clickable to load the file
    const wikiLinkRegex = /\[\[(.*?)\]\]/g;
    const processedContent = content.replace(wikiLinkRegex, (match, p1) => {
        const parts = p1.split('|');
        const target = parts[0];
        const text = parts[1] || parts[0];
        return `<a href="#" onclick="loadFile('${target}.md'); return false;">${text}</a>`;
    });

    document.getElementById('markdown-preview').innerHTML = marked.parse(processedContent);
}

function switchTab(tabName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`${tabName}-view`).classList.add('active');
    // Find button with that text and add active
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase() === tabName) btn.classList.add('active');
    });

    if (tabName === 'graph') {
        loadGraph();
    }
}

function loadGraph() {
    fetch('/api/graph')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('network');

            const nodes = new vis.DataSet(data.nodes.map(n => ({
                id: n.id,
                label: n.label,
                color: '#7b6cd6',
                font: { color: '#dcddde' }
            })));

            const edges = new vis.DataSet(data.edges.map(e => ({
                from: e.from,
                to: e.to,
                color: '#555'
            })));

            const networkData = { nodes, edges };
            const options = {
                nodes: {
                    shape: 'dot',
                    size: 16
                },
                physics: {
                    forceAtlas2Based: {
                        gravitationalConstant: -26,
                        centralGravity: 0.005,
                        springLength: 230,
                        springConstant: 0.18
                    },
                    maxVelocity: 146,
                    solver: 'forceAtlas2Based',
                    timestep: 0.35,
                    stabilization: { iterations: 150 }
                }
            };

            network = new vis.Network(container, networkData, options);

            network.on('click', function(params) {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const node = data.nodes.find(n => n.id === nodeId);
                    if (node) {
                        loadFile(node.filename);
                        switchTab('editor');
                    }
                }
            });
        });
}
