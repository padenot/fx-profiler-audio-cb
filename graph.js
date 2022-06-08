function escapeHTML(str){
    var p = document.createElement("p");
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

// Create basic Div to display information. The page can contain multiple plots
// at the same time.
function GetGraphicRootDivs() {
  var rootWrapper = document.getElementById("cb-wrapper");
  var root = document.getElementById("cb-root");
  if (!rootWrapper || !root) {
    function close_cb(e) {
      document.querySelector(".cb-wrapper").remove();
    }

    rootWrapper = document.createElement("div");
    rootWrapper.id = rootWrapper.className = "cb-wrapper";
    rootWrapper.onclick = close_cb;

    root = document.createElement("div");
    root.id = root.className = "cb-root";
    root.className = "cb-root";
    rootWrapper.appendChild(root);
    let close = document.createElement("button");
    close.className = "cb-close";
    close.innerText = "✖️";
    root.appendChild(close);
    close.onclick = close_cb;
    document.body.appendChild(rootWrapper);
  }
  return {
    rootWrapper,
    root
  };
}

// Data has the following shape:
//
// data: {
//   time: [f32array of time values],
//   load: [f32array of load values],
//   mean: mean value
//   media: median value
//   stddev: stddev value
// };
function plot(data) {
  const {rootWrapper, root} = GetGraphicRootDivs();

  var plotRoot = document.createElement("div");
  plotRoot.className = "cb-load cb-plot";
  var plotRootHist = document.createElement("div");
  plotRootHist.className = "cb-hist cb-plot";

  var load = {
    x: data.time,
    y: data.load,
    name: "Load",
    yaxis: "y1",
    type: "scatter"
  }

  var end = data.time[data.time.length - 1];
  var mean = {
    x: [0, end],
    y: [data.mean, data.mean],
    name: "Mean",
    yaxis: "y3",
    type: "scatter"
  }
  var median = {
    x: [0, end],
    y: [data.median, data.median],
    name: "Median",
    yaxis: "y4",
    type: "scatter"
  }
  var stddev = {
    x: [0, end, end, 0],
    y: [data.mean + data.stddev, data.mean+data.stddev, data.mean - data.stddev, data.mean - data.stddev],
    fill: 'toself',
    fillcolor: 'rgba(0, 0, 0, 0.3)',
    hoverinfo: 'stddev',
    hoveron: 'fills',
    mode: 'none',
    name: "Standard deviation",
  }

  var graphSeries = [
    load,
    mean,
    median,
    stddev
  ];

  var layout = {
    title: 'Audio callback load analysis',
    width: window.innerWidth * 0.75,
    xaxis: {
      exponentformat: "none"
    },
    yaxis: {
      title: 'Load',
      rangemode: 'nonnegative',
      autorange: false,
      fixedrange: true,
      range: [0, 2]
    },
    yaxis3: {
      overlaying: 'y',
      autorange: false,
      fixedrange: true,
      rangemode: 'nonnegative',
      range: [0, 2]
    },
    yaxis3: {
      overlaying: 'y',
      autorange: false,
      fixedrange: true,
      rangemode: 'nonnegative',
      range: [0, 2]
    },
    yaxis4: {
      overlaying: 'y',
      autorange: false,
      fixedrange: true,
      rangemode: 'nonnegative',
      range: [0, 2]
    }
  };

  Plotly.newPlot(plotRoot, graphSeries, layout);
  var trace = {
    title: 'Histogram of callback time',
    x: load.y,
    histnorm: 'probability',
    type: 'histogram',
    autosize: true,
  };
  var layoutHist = {
    width: window.innerWidth * 0.75, // TODO: this is bad
    title: 'Callback duration histogram',
  }
  Plotly.newPlot(plotRootHist, [trace], layoutHist);
  var title = document.createElement("h1");
  title.className = "cb-title";
  title.innerText = "Real-time audio callback load statistical analysis";
  var metricsRoot = document.createElement("div");
  metricsRoot.className = "cb-metrics";
  if (!Number.isNaN(data.mean) && !Number.isNaN(data.median) &&
      !Number.isNaN(data.variance) && !Number.isNaN(data.stddev)) {
    metricsRoot.innerHTML = `
      <table>
      <tr><td> Mean</td><td> ${data.mean.toPrecision(4)}</td></tr>
      <tr><td> Median</td><td> ${data.median.toPrecision(4)}</td></tr>
      <tr><td> Variance</td><td> ${data.variance.toPrecision(4)}</td></tr>
      <tr><td> Standard deviation</td><td> ${data.stddev.toPrecision(4)}</td></tr>
      </table>
      `;
  }

  root.appendChild(title);
  root.appendChild(metricsRoot);
  root.appendChild(plotRoot);
  root.appendChild(plotRootHist);
}

/**
 * Dataset looks like following
 * {
 *   `markerName`: [array of Result],
 *   `markerName`: [array of Result],
 *    ...
 * }
 * The full defintion of `markerName` is in [1]. Marker name won't be repeated.
 * [1]  https://searchfox.org/mozilla-central/rev/0e3d9bfae6fdaa6cb29cbce3f25471d5708aedc3/dom/media/utils/PerformanceRecorder.h#73-80
 *
 * Result looks like following
 * {
 *   markerKey: key of the marker. eg. RequestDecode:V:576<h<=720:hw,vp9,
 *   mean: mean value
 *   median: median value
 *   stddev: stddev value
 *   variance: variance value
 * }
 */
function plotPlaybackMarkers(dataSet) {
  const {rootWrapper, root} = GetGraphicRootDivs();

  let title = document.createElement("h1");
  title.className = "cb-title";
  title.innerText = "Media playback markers analysis";
  root.appendChild(title);

  // Dropdown menu for selecting the marker name.
  let selectDiv = document.createElement("div");
  selectDiv.className = "cb-select";
  let selectBox = document.createElement("select");
  selectBox.add(new Option("None"));
  Object.entries(dataSet).forEach(([key, data]) => {
    selectBox.add(new Option(key));
  });
  selectDiv.appendChild(selectBox);
  let displayContent = document.createElement("div");
  selectDiv.appendChild(displayContent);
  root.appendChild(selectDiv);

  // Prevent closing the whole diplay page by the root div click listener.
  selectBox.onclick = event => {
    event.stopPropagation();
  };

  selectBox.onchange = function() {
    // Clear display for old markers first, then append new data.
    while (displayContent.firstChild) {
      displayContent.innerHTML = "";
    }

    const selectedMarkerName = selectBox.options[selectBox.selectedIndex].text;
    Object.entries(dataSet).forEach(([key, dataSet]) => {
      // sort keys so that related keys are close to each other (e.g. video with
      // video, audio with audio, resolutions grouped, etc.)
      var dataSetSorted = dataSet.sort((a, b) => a.markerKey > b.markerKey );
      for (let data of dataSetSorted) {
        if (data.markerName != selectedMarkerName) {
          continue;
        }
        let metricsRoot = document.createElement("div");
        metricsRoot.className = "cb-metrics";
        var plotRootHist = document.createElement("div");
        plotRootHist.className = "cb-hist cb-plot";
        if (!Number.isNaN(data.mean) && !Number.isNaN(data.median) &&
            !Number.isNaN(data.variance) && !Number.isNaN(data.stddev)) {
          // Some texts in the key would be incorrectly parse as an element, eg.
          // "<h" so we add spaces to avoid that in order to show the complete
          // key name correctly.
          data.markerKey = escapeHTML(data.markerKey);
          metricsRoot.innerHTML = `
            <p><strong>${data.markerName}:</strong> ${data.markerKey}</p>
            <table>
            <tr><td> Mean</td><td> ${data.mean.toPrecision(4)}</td></tr>
            <tr><td> Median</td><td> ${data.median.toPrecision(4)}</td></tr>
            <tr><td> Variance</td><td> ${data.variance.toPrecision(4)}</td></tr>
            <tr><td> Standard deviation</td><td> ${data.stddev.toPrecision(4)}</td></tr>
            </table>
            `;

            var trace = {
              title: data.markerKey,
              x: data.durations,
              histnorm: 'probability',
              type: 'histogram',
              autosize: true,
            };
            var layoutHist = {
              width: window.innerWidth * 0.75, // TODO: this is bad
              title: data.markerKey,
              yaxis: {
                title: 'Percentage',
              },
              xaxis: {
                title: 'Time (Millisecond)',
              },
            }
            Plotly.newPlot(plotRootHist, [trace], layoutHist);
        }
        displayContent.appendChild(metricsRoot);
        displayContent.appendChild(plotRootHist);
      }
    });
  };


}
