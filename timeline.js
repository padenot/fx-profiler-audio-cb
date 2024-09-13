// Set up listener for incoming data
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "loadMarkers") {
        // Temporarily only draw regularMarkers
        const { regularMarkers } = message; // Destructure regularMarkers
        drawTimeline(regularMarkers); // Call the function to draw only regularMarkers
    }
});

function drawTimeline(markers) {
    const svg = d3.select('#timeline');
    const width = document.getElementById('timeline-container').clientWidth;
    const height = document.getElementById('timeline-container').clientHeight;
    const margin = { top: 10, right: 20, bottom: 30, left: 40 };

    svg.attr('width', width).attr('height', height);

    // Clear previous contents
    svg.selectAll('*').remove();

    // Set up a linear scale for the x-axis
    const timeScale = d3.scaleLinear()
        .domain([d3.min(markers, d => d.start), d3.max(markers, d => d.start)])
        .range([margin.left, width - margin.right]);

    // Add circles for each marker
    svg.selectAll('circle')
        .data(markers)
        .enter()
        .append('circle')
        .attr('cx', d => timeScale(d.start))
        .attr('cy', height / 2) // Adjust this if you want to position them differently
        .attr('r', 5)
        .attr('fill', 'blue');

    // Draw the X-axis at the bottom
    const xAxis = d3.axisBottom(timeScale).ticks(10);
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    // Movable vertical line
    const verticalLine = svg.append("line")
        .attr("x1", width / 2)
        .attr("x2", width / 2)
        .attr("y1", 0)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("cursor", "pointer");

    // Current time text (initially set to just the timestamp)
    const initialTimestamp = 0.00; // Set to your desired initial value
    const currentTimeText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom + 20) // Position it below the x-axis
        .attr("text-anchor", "middle")
        .attr("fill", "orange") // Different color to emphasize
        .attr("font-size", "12px")
        .text(initialTimestamp.toFixed(2)); // Show only the initial timestamp

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
        updateMarkerDetails(markers, currentTimestamp);

        // Update current time text position and value to show only the timestamp
        currentTimeText.attr("x", x)
            .text(currentTimestamp.toFixed(2)); // Show only the timestamp
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

            updateMarkerDetails(markers, currentTime);
        }
    });
}

function updateMarkerDetails(markers, currentTime) {
    const range = 3; // Range in seconds
    const filteredMarkers = markers.filter(marker =>
        marker.start >= (currentTime - range) && marker.start <= (currentTime + range)
    );

    // Clear previous details
    const markerDetailsContainer = document.getElementById("marker-details");
    markerDetailsContainer.innerHTML = ""; // Clear existing details

    // Create a table to display the markers within the range
    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
        <th>Module</th>
        <th>Name</th>
        <th>Timestamp</th>
    `;
    table.appendChild(headerRow);

    filteredMarkers.forEach(marker => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${marker.name}</td>
            <td>${marker.data ? marker.data.name : ''}</td>
            <td>${marker.start.toFixed(2)}</td>
        `;
        table.appendChild(row);
    });

    markerDetailsContainer.appendChild(table);
}

// Assuming you have a function that initializes the timeline
function initializeTimeline() {
    const container = d3.select("#timeline-container");
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;
    const margin = { top: 10, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#timeline")
        .attr("width", width)
        .attr("height", height);

    // Clear existing content
    svg.selectAll("*").remove();

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up your x scale
    const x = d3.scaleLinear()
        .range([0, chartWidth]);

    // Set up your x axis
    const xAxis = d3.axisBottom(x);

    // Append x-axis at the bottom of the chart area
    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(xAxis);

    // Your existing D3 code to create the timeline goes here
    // Make sure to use chartWidth and chartHeight for your timeline elements

    // Ensure axis labels are visible
    svg.selectAll(".x-axis text")
        .attr("dy", "1em");
}

// Call the function when the window loads or resizes
window.addEventListener('load', initializeTimeline);
window.addEventListener('resize', initializeTimeline);



