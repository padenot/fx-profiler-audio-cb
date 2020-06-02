function close_cb(e) {
  document.querySelector(".cb-wrapper").remove();
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
  var rootWrapper = document.createElement("div");
  rootWrapper.className = "cb-wrapper";
  rootWrapper.onclick = close_cb;
  var root = document.createElement("div");
  root.className = "cb-root";
  rootWrapper.appendChild(root);
  var close = document.createElement("button");
  close.className = "cb-close";
  close.innerText = "✖️";
  root.appendChild(close);
  close.onclick = close_cb;
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
  metricsRoot.innerHTML = `
  <table>
  <tr><td> Mean</td><td> ${data.mean.toPrecision(4)}</td></tr>
  <tr><td> Median</td><td> ${data.median.toPrecision(4)}</td></tr>
  <tr><td> Variance</td><td> ${data.variance.toPrecision(4)}</td></tr>
  <tr><td> Standard deviation</td><td> ${data.stddev.toPrecision(4)}</td></tr>
  </table>
  `;

  root.appendChild(title);
  root.appendChild(metricsRoot);
  root.appendChild(plotRoot);
  root.appendChild(plotRootHist);

  document.body.appendChild(rootWrapper);
}
var m = window.wrappedJSObject.filteredMarkers;
var budgets = new Float32Array(m.length);
var idx_budgets = 0;
var callbacks = new Float32Array(m.length);
var idx_callbacks = 0;
var cb_time = new Float32Array(m.length);
var idx_cb_time = 0;
var time_base = -1;
for (var i = 0; i < m.length; i++) {
  if (m[i].name.indexOf("budget") != -1) {
    if (time_base == -1) {
      time_base = m[i].start;
    }
    cb_time[idx_cb_time++] = m[i].start - time_base;
    budgets[idx_budgets++] = m[i].dur;
    continue;
  }
  if (m[i].name.indexOf("DataCallback") != -1) {
    callbacks[idx_callbacks++] = m[i].dur;
    continue;
  }
}

var callback_count = idx_callbacks;
console.log(time_base, cb_time, callbacks, budgets);

var load = new Float32Array(idx_callbacks);
for (var i = 0; i < callback_count; i++) {
  load[i] = callbacks[i] / budgets[i];
}

var results = {
  mean:0,
  median: 0,
  stddev: 0,
  variance: 0
};

var copy_load = load.slice(0);
copy_load.sort((a, b) => a - b);
results.median = copy_load[Math.floor(copy_load.length / 2)];
var len = callback_count;
// Mean
var sum = 0;

for (var i = 0; i < len; i++) {
  sum += load[i];
}
results.mean = sum / len;

// Variance
results.variance = 0;
for (var i = 0; i < len; i++) {
  results.variance += Math.pow(load[i] - results.mean, 2);
}
results.variance /= len;

// Standard deviation
results.stddev = Math.sqrt(results.variance);
results.load = load;
results.time = cb_time;
plot(results);

console.log(results);
