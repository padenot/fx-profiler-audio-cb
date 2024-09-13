// Set up listener for incoming data
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "loadMarkers") {
        const groupedMarkers = message.groupedMarkers; // Store the groupedMarkers
        drawTabs(groupedMarkers); // Draw tabs based on grouped markers
        // Temporarily only draw the markers for the first group
        const firstGroupId = Object.keys(groupedMarkers)[0];
        if (firstGroupId) {
            currentGroupId = firstGroupId; // Set the current group ID
            drawGroupMarkers(groupedMarkers[firstGroupId], groupedMarkers); // Pass the entire groupedMarkers
        }
    }
});

let currentGroupId = null; // Track the currently selected group
let verticalLine; // Variable to hold the vertical line element
let currentTimeText; // Variable to hold the current time text element
let timeScale; // Define timeScale in a broader scope

// Function to draw tabs
function drawTabs(groupedMarkers) {
    const tabContainer = d3.select("#tab-container");
    tabContainer.selectAll("*").remove(); // Clear existing tabs

    // Create a tab for each group
    Object.keys(groupedMarkers).forEach(id => {
        const markersCount = groupedMarkers[id].length; // Get the number of markers for the group
        const tab = tabContainer.append("div")
            .attr("class", "tab")
            .text(id) // Display the ID as the tab label
            .on("click", () => {
                currentGroupId = id; // Set the current group ID
                drawGroupMarkers(groupedMarkers[id], groupedMarkers); // Draw markers for the selected group
            });

        // Display the number of markers under the tab name
        tab.append("div")
            .attr("class", "marker-count")
            .text(`(${markersCount})`);

        // Close button for the tab
        tab.append("span")
            .attr("class", "close-btn")
            .text("✖") // Close icon
            .on("click", (event) => {
                event.stopPropagation(); // Prevent tab click event
                tab.remove(); // Remove the tab
                delete groupedMarkers[id]; // Optionally remove from groupedMarkers
            });
    });
}

// Function to draw markers for the selected group
function drawGroupMarkers(markers, groupedMarkers) {
    const svg = d3.select('#group-timeline'); // Select the SVG for group markers
    const container = document.getElementById('timeline-container');
    const width = container.clientWidth; // Get the width of the timeline container
    const height = container.clientHeight; // Get the height of the timeline container
    const margin = { top: 10, right: 20, bottom: 30, left: 40 }; // Define margins

    svg.attr('width', width).attr('height', height) // Set SVG dimensions to match the container
       .attr('viewBox', `0 0 ${width} ${height}`) // Set viewBox for scaling
       .attr('preserveAspectRatio', 'xMinYMin meet'); // Preserve aspect ratio

    svg.selectAll('*').remove(); // Clear previous contents

    // Set up a linear scale for the x-axis
    timeScale = d3.scaleLinear()
        .domain([0, d3.max(markers, d => d.start)]) // Adjust domain based on your data
        .range([margin.left, width - margin.right]);

    // Set up a linear scale for the y-axis
    const maxYValue = d3.max(markers, d => d.data ? Math.max(d.data.currentTimeMs, d.data.mediaDurationMs) : 0) / 1000; // Convert to seconds
    const yScale = d3.scaleLinear()
        .domain([0, maxYValue > 0 ? maxYValue : 1]) // Start from 0 to maxYValue
        .range([height - margin.bottom, margin.top]); // Invert Y-axis

    // Draw the X-axis at the bottom
    const xAxis = d3.axisBottom(timeScale).ticks(10);
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    // Draw the Y-axis on the left
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => d + ' s'); // Format ticks to show units in seconds
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis);

    // If there are markers, draw them
    if (markers.length > 0) {
        // Add circles for each marker in the selected group
        svg.selectAll('circle')
            .data(markers)
            .enter()
            .append('circle')
            .attr('cx', d => timeScale(d.start))
            .attr('cy', height / 2) // Center vertically
            .attr('r', 5)
            .attr('fill', 'blue');

        // Filter markers for 'timeupdate'
        const timeUpdateMarkers = markers.filter(marker => marker.name === 'timeupdate');

        // Draw connection lines for currentTimeMs and mediaDurationMs
        for (let i = 0; i < timeUpdateMarkers.length - 1; i++) {
            const currentMarker = timeUpdateMarkers[i];
            const nextMarker = timeUpdateMarkers[i + 1];
            if (currentMarker.data && nextMarker.data) { // Check if data exists for both markers
                const currentY = yScale(currentMarker.data.currentTimeMs / 1000); // Convert to seconds
                const nextCurrentY = yScale(nextMarker.data.currentTimeMs / 1000); // Convert to seconds
                const durationY = yScale(currentMarker.data.mediaDurationMs / 1000); // Convert to seconds
                const nextDurationY = yScale(nextMarker.data.mediaDurationMs / 1000); // Convert to seconds

                // Draw connection lines for mediaDurationMs with hover effect
                const durationLine = svg.append('line')
                    .attr('x1', timeScale(currentMarker.start))
                    .attr('y1', durationY)
                    .attr('x2', timeScale(nextMarker.start))
                    .attr('y2', nextDurationY)
                    .attr('stroke', 'green')
                    .attr('stroke-width', 2)
                    .on('mouseover', function(event) {
                        const tooltip = svg.append('text')
                            .attr('x', timeScale(currentMarker.start))
                            .attr('y', durationY)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', '12px')
                            .attr('fill', 'white')
                            .attr('background', 'black') // Add background for better contrast
                            .text(`Duration: ${currentMarker.data.mediaDurationMs / 1000} s`);

                        // Clear tooltip on mouseout
                        d3.select(this).on('mouseout', function() {
                            tooltip.remove();
                        });
                    });

                const currentTimeLine = svg.append('line')
                    .attr('x1', timeScale(currentMarker.start))
                    .attr('y1', currentY)
                    .attr('x2', timeScale(nextMarker.start))
                    .attr('y2', nextCurrentY)
                    .attr('stroke', 'orange')
                    .attr('stroke-width', 2)
                    .on('mouseover', function(event) {
                        const tooltip = svg.append('text')
                            .attr('x', timeScale(currentMarker.start))
                            .attr('y', currentY)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('font-size', '12px')
                            .attr('fill', 'white')
                            .attr('background', 'black') // Add background for better contrast
                            .text(`Current Time: ${currentMarker.data.currentTimeMs / 1000} s`);

                        // Clear tooltip on mouseout
                        d3.select(this).on('mouseout', function() {
                            tooltip.remove();
                        });
                    });
            }
        }

        // Movable vertical line
        verticalLine = svg.append("line")
            .attr("x1", width / 2)
            .attr("x2", width / 2)
            .attr("y1", 0)
            .attr("y2", height - margin.bottom)
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("cursor", "pointer");

        // Current time text (initially set to just the timestamp)
        const initialTimestamp = 0.00; // Set to your desired initial value
        currentTimeText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - margin.bottom + 20) // Position it below the x-axis
            .attr("text-anchor", "middle")
            .attr("fill", "orange") // Different color to emphasize
            .attr("font-size", "12px")
            .text(initialTimestamp.toFixed(2)); // Show only the initial timestamp

        // Set up keyboard navigation for the vertical line
        setupKeyboardNavigation(verticalLine, markers);

        // Click interaction to move the vertical line
        svg.on("click", function(event) {
            const [x] = d3.pointer(event);
            moveLine(x, groupedMarkers); // Pass groupedMarkers to moveLine
        });
    }
}

// Function to set up keyboard navigation
function setupKeyboardNavigation(verticalLine, markers) {
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
      currentX = Math.max(timeScale.range()[0], Math.min(currentX, timeScale.range()[1]));

      // Move the line
      moveLine(currentX, markers); // Pass markers to moveLine
    }
  });
}

// Function to move the vertical line and update the current time text
function moveLine(x, groupedMarkers) {
  verticalLine.attr('x1', x).attr('x2', x);
  const currentTime = timeScale.invert(x);
  updateMarkerDetails(currentGroupId, currentTime, groupedMarkers); // Pass groupedMarkers

  // Update current time text position and value to show only the timestamp
  currentTimeText.attr("x", x)
      .text(currentTime.toFixed(2)); // Show only the timestamp
}

// Function to update marker details (implementation may vary)
function updateMarkerDetails(groupId, currentTime, groupedMarkers) {
  const range = 3; // Range in seconds
  const markers = groupedMarkers[groupId] || []; // Get markers for the current group
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
