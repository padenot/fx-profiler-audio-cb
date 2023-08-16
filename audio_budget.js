var m = window.wrappedJSObject.filteredMarkers;
var store = {};
var budget_regex = /(.*)real-time budget/i;
var callback_regex = /(.*)::DataCallback/;

function get_store(name) {
  if (!(name in store)) {
    let obj = {};
    obj.budgets = new Float32Array(m.length);
    obj.idx_budgets = 0;
    obj.callbacks = new Float32Array(m.length);
    obj.idx_callbacks = 0;
    obj.cb_time = {}; new Float32Array(m.length);
    obj.idx_cb_time = 0;
    obj.time_base = -1;
    store[name] = obj;
  }

  return store[name];
}

for (var i = 0; i < m.length; i++) {
  let match = m[i].name.match(budget_regex);
  if (match) {
    let name = match[1];
    // For backwards compatibility with the budget marker name being
    // "Real-time budget", and the only callback marker name being
    // "AudioCallbackDriver::DataCallback".
    name = name.trim() || "AudioCallbackDriver";
    let obj = get_store(name);
    if (obj.time_base == -1) {
      obj.time_base = m[i].start;
    }
    obj.cb_time[obj.idx_cb_time++] = m[i].start - obj.time_base;
    obj.budgets[obj.idx_budgets++] = m[i].end - m[i].start;
    continue;
  }
  match = m[i].name.match(callback_regex);
  if (match) {
    let name = match[1];
    let obj = get_store(name);
    obj.callbacks[obj.idx_callbacks++] = m[i].end - m[i].start;
    continue;
  }
}

for (let key of Object.keys(store).sort()) {
  let obj = get_store(key);
  let callback_count = obj.idx_callbacks;

  let load = new Float32Array(obj.idx_callbacks);
  for (let i = 0; i < callback_count; i++) {
    load[i] = obj.callbacks[i] / obj.budgets[i];
  }

  let results = {
    name: key,
    mean: 0,
    median: 0,
    stddev: 0,
    variance: 0
  };

  let copy_load = load.slice(0);
  copy_load.sort((a, b) => a - b);
  results.median = copy_load[Math.floor(copy_load.length / 2)];
  let len = callback_count;
  // Mean
  let sum = 0;

  for (let i = 0; i < len; i++) {
    sum += load[i];
  }
  results.mean = sum / len;

  // Variance
  results.variance = 0;
  for (let i = 0; i < len; i++) {
    results.variance += Math.pow(load[i] - results.mean, 2);
  }
  results.variance /= len;

  // Standard deviation
  results.stddev = Math.sqrt(results.variance);
  results.load = load;
  results.time = obj.cb_time;

  if (obj.idx_budgets != 0) {
    plot(results);
  }

  console.log(results);
}
