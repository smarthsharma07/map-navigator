document.addEventListener('DOMContentLoaded', () => {
    const sourceSelect = document.getElementById('source');
    const destSelect = document.getElementById('destination');
    const navButton = document.getElementById('navigate-btn');
    const resultContainer = document.getElementById('result-container');
    const pathMetrics = document.getElementById('path-metrics');
    const pathTimeline = document.getElementById('path-timeline');

    // Graph Data Layout (Hardcoded positions for pseudo-map)
    // Matches the C++ index IDs exactly:
    const nodes = [
        { id: 0, x: 100, y: 300 },   // Main Gate
        { id: 1, x: 280, y: 300 },   // Admin Block
        { id: 2, x: 460, y: 150 },   // Library
        { id: 3, x: 460, y: 450 },   // CS Dept
        { id: 4, x: 640, y: 380 },   // Mech Dept
        { id: 5, x: 640, y: 500 },   // Elec Dept
        { id: 6, x: 640, y: 150 },   // Auditorium
        { id: 7, x: 640, y: 270 },   // Cafeteria
        { id: 8, x: 820, y: 270 },   // Sports Complex
        { id: 9, x: 820, y: 150 },   // Boys Hostel
        { id: 10, x: 820, y: 450 },  // Girls Hostel
        { id: 11, x: 100, y: 150 }   // Parking
    ];

    // Edges defined in C++ graph (Updated to feel more structurally logical)
    const edges = [
        [0, 1], [0, 11], [1, 2], [1, 3], 
        [11, 2], [2, 3], [2, 6], [3, 4], [3, 5], 
        [4, 5], [4, 7], [6, 7], [7, 8], 
        [8, 9], [8, 10]
    ];

    let locationNames = []; // We will get these from API to keep DRY

    // Fetch locations to populate dropdowns and node labels
    fetch('/api/locations')
        .then(response => response.json())
        .then(data => {
            if (data.locations) {
                locationNames = data.locations;
                populateDropdowns(locationNames);
                drawInitialMap(); // Draw the un-highlighted map once we have the names
            }
        })
        .catch(err => {
            console.error("Error fetching locations:", err);
            sourceSelect.innerHTML = '<option disabled>Error loading locations</option>';
            destSelect.innerHTML = '<option disabled>Error loading locations</option>';
        });

    function populateDropdowns(locations) {
        let optionsHtml = '<option value="" disabled selected>Choose a location</option>';
        locations.forEach((loc, index) => {
            optionsHtml += `<option value="${index}">${loc}</option>`;
        });

        sourceSelect.innerHTML = optionsHtml;
        destSelect.innerHTML = optionsHtml;
    }

    /* -------------------------------------
       SVG Pseudo-Map Visualization Logic
       ------------------------------------- */

    function drawInitialMap() {
        const edgesLayer = document.getElementById('edges-layer');
        const nodesLayer = document.getElementById('nodes-layer');
        
        edgesLayer.innerHTML = '';
        nodesLayer.innerHTML = '';

        // 1. Draw all edges initially (grey/faded)
        edges.forEach(edge => {
            const srcNode = nodes.find(n => n.id === edge[0]);
            const destNode = nodes.find(n => n.id === edge[1]);

            if (srcNode && destNode) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", srcNode.x);
                line.setAttribute("y1", srcNode.y);
                line.setAttribute("x2", destNode.x);
                line.setAttribute("y2", destNode.y);
                line.setAttribute("class", "edge");
                // Create a unique ID to find it later
                line.setAttribute("id", `edge-${edge[0]}-${edge[1]}`);
                edgesLayer.appendChild(line);
            }
        });

        // 2. Draw all nodes
        nodes.forEach(node => {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("id", `node-group-${node.id}`);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x);
            circle.setAttribute("cy", node.y);
            circle.setAttribute("r", 15);
            circle.setAttribute("class", "node-circle");
            circle.setAttribute("id", `node-circle-${node.id}`);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", node.x);
            text.setAttribute("y", node.y - 25); // Just above the circle
            text.setAttribute("class", "node-label");
            text.textContent = locationNames[node.id];

            group.appendChild(circle);
            group.appendChild(text);
            nodesLayer.appendChild(group);
        });
    }

    function highlightPath(pathArray) {
        // Reset everything first
        document.querySelectorAll('.edge').forEach(e => e.classList.remove('edge-highlight'));
        document.querySelectorAll('.node-circle').forEach(n => n.classList.remove('node-highlight'));

        // Identify node IDs from their names
        const pathNodeIds = pathArray.map(name => locationNames.indexOf(name));

        // Highlight nodes
        pathNodeIds.forEach(id => {
            document.getElementById(`node-circle-${id}`).classList.add('node-highlight');
        });

        // Highlight edges
        const highlightLayer = document.getElementById('highlight-layer');
        highlightLayer.innerHTML = ''; // Specific layer for animated lines so they sit above grey lines

        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            const u = pathNodeIds[i];
            const v = pathNodeIds[i+1];
            
            // Edges might be defined u->v or v->u in our list, get coordinates manually
            const srcNode = nodes.find(n => n.id === u);
            const destNode = nodes.find(n => n.id === v);

            const highlightLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            highlightLine.setAttribute("x1", srcNode.x);
            highlightLine.setAttribute("y1", srcNode.y);
            highlightLine.setAttribute("x2", destNode.x);
            highlightLine.setAttribute("y2", destNode.y);
            highlightLine.setAttribute("class", "edge edge-highlight"); // Combine base and highlight

            highlightLayer.appendChild(highlightLine);
        }
    }


    /* -------------------------------------
       API Logic
       ------------------------------------- */

    navButton.addEventListener('click', () => {
        const src = sourceSelect.value;
        const dest = destSelect.value;

        if (src === "" || dest === "") {
            alert("Please select both a starting point and a destination.");
            return;
        }

        // Disable button during loading
        const originalText = navButton.innerHTML;
        navButton.innerHTML = 'Calculating...';
        navButton.disabled = true;

        fetch(`/api/navigate?src=${src}&dest=${dest}`)
            .then(res => res.json())
            .then(data => {
                navButton.innerHTML = originalText;
                navButton.disabled = false;

                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }

                if (data.path) {
                    displayResult(data.path);
                    highlightPath(data.path); // Update Map Visualization!
                }
            })
            .catch(err => {
                console.error("Error navigating:", err);
                navButton.innerHTML = originalText;
                navButton.disabled = false;
                alert("Failed to calculate path.");
            });
    });

    function displayResult(path) {
        resultContainer.style.display = 'block';
        pathTimeline.innerHTML = ''; // Clear previous

        if (path.length === 0) {
            pathMetrics.textContent = "No path found between these locations.";
            return;
        }

        const edgesCount = path.length - 1;
        pathMetrics.textContent = `${edgesCount} Stops required (Minimum Edge Path)`;

        path.forEach((loc, index) => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'timeline-node';
            // Stagger animations
            nodeDiv.style.animationDelay = `${index * 0.1}s`;

            let typeLabel = "Intermediate Stop";
            if (index === 0) typeLabel = "Starting Point";
            if (index === path.length - 1) typeLabel = "Destination";

            nodeDiv.innerHTML = `
                <div class="node-name">${loc}</div>
                <div class="node-type">${typeLabel}</div>
            `;
            pathTimeline.appendChild(nodeDiv);
        });
    }
});
