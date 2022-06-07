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
    budgets[idx_budgets++] = m[i].end - m[i].start;
    continue;
  }
  if (m[i].name.indexOf("DataCallback") != -1) {
    callbacks[idx_callbacks++] = m[i].end - m[i].start;
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
