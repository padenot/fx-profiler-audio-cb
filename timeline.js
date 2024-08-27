// Set up listener for incoming data
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "loadMarkers") {
        drawTimeline(message.markers);
    }
});

function drawTimeline(markers) {
    const svg = d3.select('#timeline');
    const width = document.getElementById('timeline-container').clientWidth;
    const height = 100;  // Set a fixed height for the SVG
    svg.attr('width', width).attr('height', height);

    // Set up a linear scale (not time scale)
    const timeScale = d3.scaleLinear()
        .domain([d3.min(markers, d => d.start), d3.max(markers, d => d.start)])
        .range([0, width]);

    // Clear previous contents
    svg.selectAll('*').remove();

    // Add circles for each marker
    svg.selectAll('circle')
        .data(markers)
        .enter()
        .append('circle')
        .attr('cx', d => timeScale(d.start))
        .attr('cy', height / 2)
        .attr('r', 5)
        .attr('fill', 'blue');

    // Draw the X-axis for numeric timestamps
    const xAxis = d3.axisBottom(timeScale).ticks(10);
    svg.append("g")
        .attr("transform", `translate(0, ${height / 2})`)
        .call(xAxis);

    // Movable vertical line
    const verticalLine = svg.append("line")
        .attr("x1", width / 2)
        .attr("x2", width / 2)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("cursor", "pointer");
    setupKeyboardNavigation(verticalLine, timeScale, markers);

    // Drag and click interaction
    svg.on("click", function(event) {
        const x = d3.pointer(event, this)[0];
        moveLine(x);
    });

    const drag = d3.drag()
        .on("drag", function(event) {
            moveLine(event.x);
        });

    verticalLine.call(drag);

    function moveLine(x) {
        verticalLine.attr("x1", x).attr("x2", x);
        const currentTimestamp = timeScale.invert(x);
        updateCurrentTimeDisplay(currentTimestamp);
        updateMarkerDetails(markers, currentTimestamp);
    }
}

function setupKeyboardNavigation(verticalLine, timeScale, markers) {
    const step = (timeScale.range()[1] - timeScale.range()[0]) / 100; // Defines the step size for each key press

    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            // Prevent default to stop any default behavior like scrolling
            event.preventDefault();

            // Get the current position of the line
            let currentX = parseFloat(verticalLine.attr('x1'));
            
            // Update position based on the key pressed
            if (event.key === 'ArrowLeft') {
                currentX -= step;
            } else if (event.key === 'ArrowRight') {
                currentX += step;
            }

            // Clamp the value to ensure it doesn't go out of bounds
            currentX = Math.max(0, Math.min(currentX, timeScale.range()[1]));

            // Move the line
            verticalLine.attr('x1', currentX).attr('x2', currentX);

            // Update the displayed time and marker details
            const currentTime = timeScale.invert(currentX);
            updateCurrentTimeDisplay(currentTime);
            updateMarkerDetails(markers, currentTime);
        }
    });
}

function updateCurrentTimeDisplay(time) {
    document.getElementById("current-time-display").textContent = `${time.toFixed(2)}`;
}

function updateMarkerDetails(markers, currentTime) {
    let closest = markers.reduce((prev, curr) => {
        return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime) ? curr : prev);
    });
    document.getElementById("marker-module").textContent = closest.data.module;
    document.getElementById("marker-name").textContent = closest.data.name;
    document.getElementById("marker-timestamp").textContent = closest.start.toFixed(2);
}



