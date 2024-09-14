let mediaElementMarkers;
let currentGroupId = null; // Track the currently selected group
let verticalLine; // Variable to hold the vertical line element
let currentTimeText; // Variable to hold the current time text element
let timeScale; // Define timeScale in a broader scope
let svg; // Used to draw timeline

// Set up listener for incoming data
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "loadMarkers") {
    mediaElementMarkers = message.groupedMarkers;
    drawTabs(); // Draw tabs based on grouped markers
    const firstGroupId = Object.keys(mediaElementMarkers)[0];
    if (firstGroupId) {
      currentGroupId = firstGroupId;
      drawGroupMarkers(mediaElementMarkers[firstGroupId]);
    }
  }
});

// Function to draw tabs
function drawTabs() {
  const tabContainer = d3.select("#tab-container");
  tabContainer.selectAll("*").remove(); // Clear existing tabs

  // Create a tab for each group
  Object.keys(mediaElementMarkers).forEach(id => {
    const markersCount = mediaElementMarkers[id].length; // Get the number of markers for the group
    const tab = tabContainer.append("div")
      .attr("class", "tab")
      .text(id) // Display the ID as the tab label
      .on("click", () => {
        currentGroupId = id; // Set the current group ID
        drawGroupMarkers(mediaElementMarkers[id]); // Draw markers for the selected group
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
      });
  });
}

// Function to draw markers for the selected group
function drawGroupMarkers(markers) {
  const container = document.getElementById('timeline-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 10, right: 20, bottom: 30, left: 40 };

  svg = d3.select('#group-timeline');
  svg.attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet');

  svg.selectAll('*').remove();

  // Set up scales
  timeScale = d3.scaleLinear()
    .domain([0, d3.max(markers, d => d.start)])
    .range([margin.left, width - margin.right]);

  const maxYValue = d3.max(markers, d => d.data ? Math.max(d.data.currentTimeMs, d.data.mediaDurationMs) : 0) / 1000;
  const yScale = d3.scaleLinear()
    .domain([0, maxYValue > 0 ? maxYValue : 1])
    .range([height - margin.bottom, margin.top]);

  // Draw axes
  svg.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(timeScale).ticks(10));

  svg.append("g").attr("class", "y-axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + ' s'));

  // Draw markers and lines
  if (markers.length > 0) {
    svg.selectAll('circle')
      .data(markers)
      .enter()
      .append('circle')
      .attr('cx', d => timeScale(d.start))
      .attr('cy', height / 2)
      .attr('r', 5)
      .attr('fill', 'blue');

    const timeUpdateMarkers = markers.filter(marker => marker.name === 'timeupdate');
    timeUpdateMarkers.forEach((currentMarker, i) => {
      if (i < timeUpdateMarkers.length - 1) {
        const nextMarker = timeUpdateMarkers[i + 1];
        if (currentMarker.data && nextMarker.data) {
          drawConnectionLines(currentMarker, nextMarker, yScale);
        }
      }
    });

    // Movable vertical line and current time text
    setupVerticalLine(width, height, margin, markers, yScale);
  }
}

// New helper function to draw connection lines
function drawConnectionLines(currentMarker, nextMarker, yScale) {
  const currentY = yScale(currentMarker.data.currentTimeMs / 1000);
  const nextCurrentY = yScale(nextMarker.data.currentTimeMs / 1000);
  const durationY = yScale(currentMarker.data.mediaDurationMs / 1000);
  const nextDurationY = yScale(nextMarker.data.mediaDurationMs / 1000);

  svg.append('line')
    .attr('x1', timeScale(currentMarker.start))
    .attr('y1', durationY)
    .attr('x2', timeScale(nextMarker.start))
    .attr('y2', nextDurationY)
    .attr('stroke', 'green')
    .attr('stroke-width', 2)
    .on('mouseover', function(event) { showTooltip(currentMarker, durationY, 'Duration', currentMarker.data.mediaDurationMs); });

  svg.append('line')
    .attr('x1', timeScale(currentMarker.start))
    .attr('y1', currentY)
    .attr('x2', timeScale(nextMarker.start))
    .attr('y2', nextCurrentY)
    .attr('stroke', 'orange')
    .attr('stroke-width', 2)
    .on('mouseover', function(event) { showTooltip(currentMarker, currentY, 'Current Time', currentMarker.data.currentTimeMs); });
}

// New helper function to show tooltips
function showTooltip(marker, y, label, value) {
  const tooltip = svg.append('text')
    .attr('x', timeScale(marker.start))
    .attr('y', y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '12px')
    .attr('fill', 'white')
    .text(`${label}: ${value / 1000} s`);

  d3.select(this).on('mouseout', function() {
    tooltip.remove();
  });
}

// New helper function to set up the vertical line and current time text
function setupVerticalLine(width, height, margin, markers, yScale) {
  verticalLine = svg.append("line")
    .attr("x1", width / 2)
    .attr("x2", width / 2)
    .attr("y1", 0)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("cursor", "pointer");

  const initialTimestamp = 0.00;
  currentTimeText = svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - margin.bottom + 20)
    .attr("text-anchor", "middle")
    .attr("fill", "orange")
    .attr("font-size", "12px")
    .text(initialTimestamp.toFixed(2));

  setupKeyboardNavigation(verticalLine, markers, yScale);
  svg.on("click", function(event) {
    const [x] = d3.pointer(event);
    moveLine(x, yScale);
  });

  const drag = d3.drag()
    .on("start", function(event) { d3.select(this).raise(); })
    .on("drag", function(event) {
      const x = d3.pointer(event)[0];
      moveLine(x, yScale);
    });

  verticalLine.call(drag);
}

// Function to set up keyboard navigation
function setupKeyboardNavigation(verticalLine, markers, yScale) {
  const step = (timeScale.range()[1] - timeScale.range()[0]) / 100;

  document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();

      let currentX = parseFloat(verticalLine.attr('x1'));

      if (event.key === 'ArrowLeft') {
        currentX -= step;
      } else if (event.key === 'ArrowRight') {
        currentX += step;
      }

      currentX = Math.max(timeScale.range()[0], Math.min(currentX, timeScale.range()[1]));

      moveLine(currentX, yScale);
    }
  });
}

// Function to move the vertical line and update the current time text
function moveLine(x, yScale) {
  verticalLine.attr('x1', x).attr('x2', x);
  const currentTime = timeScale.invert(x);
  updateMarkerDetails(currentGroupId, currentTime);

  currentTimeText.attr("x", x)
    .text(currentTime.toFixed(2));

  const markers = mediaElementMarkers[currentGroupId] || [];
  const closestMarker = markers
    .filter(marker => marker.data && marker.start <= currentTime)
    .reduce((prev, curr) => (prev.start > curr.start ? prev : curr), markers[0]);

  if (closestMarker) {
    const closestY = yScale(closestMarker.data.currentTimeMs / 1000);
    svg.selectAll('.closest-marker-text').remove();
    svg.append("text")
      .attr("class", "closest-marker-text")
      .attr("x", x)
      .attr("y", closestY - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text(`CurrentTime: ${closestMarker.data.currentTimeMs / 1000} s`)
      .append("tspan")
      .attr("x", x)
      .attr("dy", "1.2em")
      .text(`Duration: ${closestMarker.data.mediaDurationMs / 1000} s`);
  }
}

// Function to update marker details (implementation may vary)
function updateMarkerDetails(groupId, currentTime) {
  const range = 3;
  const markers = mediaElementMarkers[groupId] || [];
  const filteredMarkers = markers.filter(marker =>
    marker.start >= (currentTime - range) && marker.start <= (currentTime + range)
  );

  const markerDetailsContainer = document.getElementById("marker-details");
  markerDetailsContainer.innerHTML = "";

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
