let groupedMarkers;
let currentGroupId = null; // Track the currently selected group
let verticalLine; // Variable to hold the vertical line element
let currentTimeText; // Variable to hold the current time text element
let timeScale; // Define timeScale in a broader scope
let svg; // Used to draw timeline
let resizeColors = {}; // Object to store colors for each width
let colorIndex = 0; // Index to assign unique colors
let searchFilteredMarkers; // Variable to store filtered markers
let resolutionColorMap = {}; // Global object to store colors for each resolution
const excludedMarkers = ['rendervideo']; // Markers won't show in the details section

// Function to generate a unique color
function getUniqueColor(resolution) {
  if (!resolutionColorMap[resolution]) {
    const colors = ['red', 'blue', 'yellow', 'orange', 'purple', 'cyan', 'magenta'];
    resolutionColorMap[resolution] = colors[Object.keys(resolutionColorMap).length % colors.length];
  }
  return resolutionColorMap[resolution];
}

function getCurrentGroupMarkers() {
  return groupedMarkers[currentGroupId];
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "loadMarkers") {
    groupedMarkers = message.groupedMarkers;
    let maxMarkersCount = 0;
    Object.keys(groupedMarkers).forEach(id => {
      const markersCount = groupedMarkers[id].length;
      if (markersCount > maxMarkersCount) {
        maxMarkersCount = markersCount;
        currentGroupId = id;
      }
    });
    drawTabs();
    if (currentGroupId) {
      drawGroupMarkers(groupedMarkers[currentGroupId]);
      // Ensure the default tab is selected
      d3.select(`#tab-container .tab:has-text('${currentGroupId}')`).classed('selected', true);
    }
  }
});

function drawTabs() {
  const tabContainer = d3.select("#tab-container");
  tabContainer.selectAll("*").remove(); // Clear existing tabs

  // Create a tab for each group
  Object.keys(groupedMarkers).forEach(id => {
    const markersCount = groupedMarkers[id].length;
    const tab = tabContainer.append("div")
      .attr("class", "tab")
      .text(id) // Display the ID as the tab label
      .on("click", () => {
        tabContainer.selectAll('.tab').classed('selected', false);
        tab.classed('selected', true);
        currentGroupId = id;
        drawGroupMarkers(groupedMarkers[id]);
        updateMarkerDetails(id, 0);
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

    if (id == currentGroupId) {
      tab.classed('selected', true);
    }
  });

  // Add event listener for search input
  d3.select("#search-bar").on("input", function() {
    const searchTerm = this.value;
    filterMarkers(searchTerm);
  });
}

// Add this function to filter markers based on search input
function filterMarkers(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  searchFilteredMarkers = groupedMarkers[currentGroupId].filter(marker =>
    regex.test(marker.name) || regex.test(JSON.stringify(marker.data))
  );
  drawGroupMarkers(searchFilteredMarkers);
  updateMarkerDetails(currentGroupId, timeScale.invert(svg.select('line').attr('x1')));
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
  svg.width = width;
  svg.height = height;
  svg.margin = margin;
  svg.maxYValue = d3.max(getCurrentGroupMarkers(), d => d.data ? Math.max(d.data.currentTimeMs, d.data.mediaDurationMs) : 0) / 1000;
  svg.yScale = d3.scaleLinear()
    .domain([0, svg.maxYValue > 0 ? svg.maxYValue : 1])
    .range([svg.height - margin.bottom, margin.top]);
  svg.selectAll('*').remove();

  // Set up scales
  timeScale = d3.scaleLinear()
    .domain([0, d3.max(markers, d => d.start)])
    .range([margin.left, width - margin.right]);

  // Draw axes
  svg.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(timeScale).ticks(10));

  // svg.append("g").attr("class", "y-axis")
  //   .attr("transform", `translate(${margin.left}, 0)`)
  //   .call(d3.axisLeft(svg.yScale).ticks(5).tickFormat(d => d + ' s'));

  // Draw markers and lines
  if (markers.length > 0) {
    const resizeColorMap = createColorMap(markers);
    drawEventDots(markers);
    drawBufferedRange();
    drawCurrentTimeAndDurationLines();
    drawVerticalLine();
    drawResolutionLegend(resizeColorMap);
  }
}

function drawEventDots(markers) {
  markers.forEach((marker) => {
    const currentColor = Object.keys(resizeColors).reduce((color, start) => {
      return (marker.start > start) ? resizeColors[start].color : color;
    }, null);

    // Draw marker
    svg.append('circle')
      .attr('cx', timeScale(marker.start))
      .attr('cy', svg.height / 2)
      .attr('r', 5)
      .attr('fill', currentColor || 'grey') // Default if no resize color found
      .attr('stroke', 'black')
      .attr('stroke-width', 1);
  });
}

function drawResolutionLegend(colorMap) {
  const legendContainer = d3.select("#resolution-legend");
  legendContainer.selectAll("*").remove(); // Clear existing legend items

  Object.keys(colorMap).forEach((resolution, index) => { // Added index for positioning
    const color = colorMap[resolution].color;
    const description = colorMap[resolution].description;

    const legendItem = legendContainer.append("div")
      .style("display", "flex") // Use flexbox for horizontal alignment
      .style("align-items", "center") // Center items vertically
      .style("margin", "0 20px") // Increased margin for better spacing
      .attr("title", resolution)
      .attr("id", `legend-item-${index}`)

    legendItem.append("div")
      .style("background-color", color)
      .style("width", "20px")
      .style("height", "20px")
      .style("margin-right", "5px"); // Space between color rect and description

    legendItem.append("div")
      .text(`${description}`);
  });

  // Add media queries for legend layout
  if (window.matchMedia("(max-width: 600px)").matches) {
    // Apply vertical layout for small screens
    legendContainer.style("flex-direction", "column");
  } else {
    // Apply horizontal layout for larger screens
    legendContainer.style("flex-direction", "row");
  }
}

function drawBufferedRange() {
  const progressMarkers = getCurrentGroupMarkers().filter(marker => marker.name === 'progress');
  progressMarkers.forEach((currentMarker, i) => {
    const nextMarker = progressMarkers[i + 1] ? progressMarkers[i + 1] : null;
    // SVG's y-axis is decreasing when going up
    const startY = svg.yScale(currentMarker.data.bufferStartMs / 1000);
    const endY = svg.yScale(currentMarker.data.bufferEndMs / 1000);

    const lineHeight = Math.abs(endY - startY); // Calculate the height based on connection lines

    svg.append('rect')
      .attr('x', timeScale(currentMarker.start))
      .attr('y', Math.min(startY, endY)) // Align the bottom of the rectangle with the x-axis
      .attr('width', nextMarker ? timeScale(nextMarker.start) - timeScale(currentMarker.start) : svg.width - timeScale(currentMarker.start))
      .attr('height', lineHeight) // Set height to match connection lines
      .attr('fill', 'whitesmoke')
      .attr('fill-opacity', 0.3);
  });
}

function drawCurrentTimeAndDurationLines() {
  function drawConnectionLines(currentMarker, nextMarker) {
    const currentY = svg.yScale(currentMarker.data.currentTimeMs / 1000);
    const nextCurrentY = svg.yScale(nextMarker.data.currentTimeMs / 1000);
    const durationY = svg.yScale(currentMarker.data.mediaDurationMs / 1000);
    const nextDurationY = svg.yScale(nextMarker.data.mediaDurationMs / 1000);

    svg.append('line')
      .attr('x1', timeScale(currentMarker.start))
      .attr('y1', durationY)
      .attr('x2', timeScale(nextMarker.start))
      .attr('y2', nextDurationY)
      .attr('stroke', 'green')
      .attr('stroke-width', 2)

    svg.append('line')
      .attr('x1', timeScale(currentMarker.start))
      .attr('y1', currentY)
      .attr('x2', timeScale(nextMarker.start))
      .attr('y2', nextCurrentY)
      .attr('stroke', 'orange')
      .attr('stroke-width', 2)
  }

  const timeUpdateMarkers = getCurrentGroupMarkers().filter(marker => marker.name === 'timeupdate');
  timeUpdateMarkers.forEach((currentMarker, i) => {
    if (i < timeUpdateMarkers.length - 1) {
      const nextMarker = timeUpdateMarkers[i + 1];
      if (currentMarker.data && nextMarker.data) {
        drawConnectionLines(currentMarker, nextMarker);
      }
    }
  });
}

function createColorMap(markers) {
  // Create an array to hold resize markers and their colors
  const resizeMarkers = markers.filter(marker => marker.name === 'resize');
  const resizeColorMap = {};

  resizeMarkers.forEach((marker, index) => {
    const description = `${marker.data.width}x${marker.data.height}`;
    if (!resizeColorMap[description]) {
      resizeColorMap[description] = {
        color: getUniqueColor(description),
        description: description
      };
    }
    resizeColors[marker.start] = resizeColorMap[description];
  });
  return resizeColorMap;
}

function drawVerticalLine() {
  verticalLine = svg.append("line")
    .attr("x1", svg.width / 2)
    .attr("x2", svg.width / 2)
    .attr("y1", 0)
    .attr("y2", svg.height - svg.margin.bottom)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("cursor", "pointer");

  const initialTimestamp = 0.00;
  currentTimeText = svg.append("text")
    .attr("x", svg.width / 2)
    .attr("y", svg.height - svg.margin.bottom + 20)
    .attr("text-anchor", "middle")
    .attr("fill", "orange")
    .attr("font-size", "12px")
    .text(initialTimestamp.toFixed(2));

  setupKeyboardNavigation(verticalLine);
  svg.on("mousemove", function(event) {
    const [x] = d3.pointer(event);
    moveLine(x);
  });
}

function setupKeyboardNavigation(verticalLine) {
  const step = (timeScale.range()[1] - timeScale.range()[0]) / 500;

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

      moveLine(currentX);
    }
  });
}

// Function to move the vertical line and update the current time text
function moveLine(x) {
  verticalLine.attr('x1', x).attr('x2', x);
  const currentTime = timeScale.invert(x);
  updateMarkerDetails(currentGroupId, currentTime);

  currentTimeText.attr("x", x)
    .text(currentTime.toFixed(2));

  const markers = groupedMarkers[currentGroupId] || [];
  const closestTimeupdate = markers
    .filter(marker => marker.data && marker.start <= currentTime && marker.name === 'timeupdate')
    .reduce((prev, curr) => (prev.start > curr.start ? prev : curr), markers[0]);
  const closestProgress = markers
    .filter(marker => marker.data && marker.start <= currentTime && marker.name === 'progress')
    .reduce((prev, curr) => (prev.start > curr.start ? prev : curr), markers[0]);
  const closestResolution = markers
    .filter(marker => marker.name === 'resize' && marker.data && marker.start <= currentTime)
    .reduce((prev, curr) => (prev ? (prev.start > curr.start ? prev : curr) : curr), null);

  if (closestProgress || closestTimeupdate || closestResolution) {
    svg.selectAll('.closest-text').remove(); // Remove previous text elements

    const bufferStartText = closestProgress ? `Buffer Start:` : '';
    const bufferEndText = closestProgress ? `Buffer End:` : '';
    const currentTimeText = closestTimeupdate ? `CurrentTime:` : '';
    const durationText = closestTimeupdate ? `Duration:` : '';

    const bufferStartValue = closestProgress && closestProgress.data ? `${closestProgress.data.bufferStartMs / 1000} s` : '';
    const bufferEndValue = closestProgress && closestProgress.data ? `${closestProgress.data.bufferEndMs / 1000} s` : '';
    const currentTimeValue = closestTimeupdate && closestTimeupdate.data ? `${closestTimeupdate.data.currentTimeMs / 1000} s` : '';
    const durationValue = closestTimeupdate && closestTimeupdate.data ? `${closestTimeupdate.data.mediaDurationMs / 1000} s` : '';

    const resolutionText = closestResolution ? `Resolution:` : '';
    const resolutionValue = closestResolution && closestResolution.data ? `${closestResolution.data.width}x${closestResolution.data.height}` : '';

    const textX = x; // Base x position for the labels
    const valueXOffset = 100; // Adjust this value to align the YYYs

    svg.append("text")
      .attr("class", "closest-text")
      .attr("x", textX)
      .attr("text-anchor", "start")
      .attr("fill", "white")
      .attr("font-size", "13px")
      .text(bufferStartText)
      .append("tspan")
      .attr("x", valueXOffset + textX)
      .text(bufferStartValue)
      .append("tspan")
      .attr("x", textX)
      .attr("dy", "0.9em")
      .text(bufferEndText)
      .append("tspan")
      .attr("x", valueXOffset + textX)
      .text(bufferEndValue)
      .append("tspan")
      .attr("x", textX)
      .attr("dy", "0.9em")
      .text(currentTimeText)
      .append("tspan")
      .attr("x", valueXOffset + textX)
      .text(currentTimeValue)
      .append("tspan")
      .attr("x", textX)
      .attr("dy", "0.9em")
      .text(durationText)
      .append("tspan")
      .attr("x", valueXOffset + textX)
      .text(durationValue)
      .append("tspan")
      .attr("x", textX)
      .attr("dy", "0.9em")
      .text(resolutionText)
      .append("tspan")
      .attr("x", valueXOffset + textX)
      .text(resolutionValue)
  }
}

function getMarkerDetails(marker) {
  if (marker.name === 'timeupdate') {
    return marker.data ? `currentTime : ${marker.data.currentTimeMs} ms, duration : ${marker.data.mediaDurationMs} ms` : '';
  } else if (marker.name === 'progress') {
    return `bufferStart : ${marker.data.bufferStartMs} ms, bufferEnd : ${marker.data.bufferEndMs} ms`;
  } else if (marker.name === 'resize') {
    return `${marker.data.width}x${marker.data.height}`;
  } else if (marker.name === 'loadedmetadata') {
    return `src: ${marker.data.src}<br>audio: ${marker.data.audioMimeType}, video: ${marker.data.videoMimeType}`;
  } else if (marker.name == 'cdmresolved') {
    const config = JSON.parse(marker.data.configuration);
    let details = `<b>keySystem:</b> ${marker.data.keySystem}<br><b>config:</b> <br>`;
    if (config.label) details += `&emsp;<b>label:</b> ${config.label}<br>`;
    if (config.initDataTypes && config.initDataTypes.length > 0) details += `&emsp;<b>initDataTypes:</b> ${config.initDataTypes.join(', ')}<br>`;
    if (config.audioCapabilities && config.audioCapabilities.length > 0) {
      details += `&emsp;<b>audioCapabilities:</b> <br>`;
      config.audioCapabilities.forEach(cap => {
        details += `&emsp;&emsp;<b>contentType:</b> ${cap.contentType}<br>&emsp;&emsp;<b>robustness:</b> ${cap.robustness}<br>&emsp;&emsp;<b>encryptionScheme:</b> ${cap.encryptionScheme}<br>`;
      });
    }
    if (config.videoCapabilities && config.videoCapabilities.length > 0) {
      details += `&emsp;<b>videoCapabilities:</b> <br>`;
      config.videoCapabilities.forEach(cap => {
        details += `&emsp;&emsp;<b>contentType:</b> ${cap.contentType}<br>&emsp;&emsp;<b>robustness:</b> ${cap.robustness}<br>&emsp;&emsp;<b>encryptionScheme:</b> ${cap.encryptionScheme}<br>`;
      });
    }
    if (config.distinctiveIdentifier) details += `&emsp;<b>distinctiveIdentifier:</b> ${config.distinctiveIdentifier}<br>`;
    if (config.persistentState) details += `&emsp;<b>persistentState:</b> ${config.persistentState}<br>`;
    if (config.sessionTypes && config.sessionTypes.length > 0) details += `&emsp;<b>sessionTypes:</b> ${config.sessionTypes.join(', ')}`;
    return details;
  }
  return '';
}

function updateMarkerDetails(groupId, currentTime) {
  const range = 3;
  const markers = searchFilteredMarkers || groupedMarkers[groupId] || [];
  const filteredMarkers = markers.filter(marker =>
    marker.start >= (currentTime - range) && marker.start <= (currentTime + range)
  );

  const markerDetailsContainer = document.getElementById("marker-details");
  markerDetailsContainer.innerHTML = "";

  const table = document.createElement("table");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>Name</th>
    <th>Details</th>
    <th>Timestamp</th>
  `;
  table.appendChild(headerRow);

  filteredMarkers.forEach(marker => {
    if (excludedMarkers.includes(marker.name)) return;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${marker.name}</td>
      <td>${getMarkerDetails(marker)}</td>
      <td>${marker.start.toFixed(2)}</td>
    `;
    table.appendChild(row);
  });

  markerDetailsContainer.appendChild(table);
}

function handleResize() {
  const container = document.getElementById('timeline-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Update SVG dimensions
  svg.attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Recalculate scales
  timeScale.range([svg.margin.left, width - svg.margin.right]);
  svg.yScale.range([height - svg.margin.bottom, svg.margin.top]);

  drawGroupMarkers(getCurrentGroupMarkers());
  updateLegendLayout();
  updateMarkerDetailsLayout();
}

window.addEventListener('resize', handleResize);

function updateLegendLayout() {
  const legendContainer = d3.select("#resolution-legend");
  if (window.matchMedia("(max-width: 600px)").matches) {
    // Apply vertical layout for small screens
    legendContainer.style("flex-direction", "column");
    legendContainer.selectAll("div")
      .style("margin", "5px 0");
  } else {
    // Apply horizontal layout for larger screens
    legendContainer.style("flex-direction", "row");
    legendContainer.selectAll("div")
      .style("margin", "0 10px");
  }
}

function updateMarkerDetailsLayout() {
  const markerDetailsContainer = document.getElementById("marker-details");
  const table = markerDetailsContainer.querySelector("table");
  if (window.matchMedia("(max-width: 600px)").matches) {
    // Make table scrollable on small screens
    markerDetailsContainer.style.overflowX = "auto";
    table.style.width = "100%";
    table.style.fontSize = "12px";
  } else {
    // Reset styles for larger screens
    markerDetailsContainer.style.overflowX = "visible";
    table.style.width = "auto";
    table.style.fontSize = "14px";
  }
}
