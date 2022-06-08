
function collectPlaybackMarkersDuration(targetedName) {
  let result = {};
  const categoryMediaPlayback = 16;
  for (let marker of window.wrappedJSObject.filteredMarkers) {
    if (marker.category != categoryMediaPlayback) {
      continue;
    }
    console.log(marker);
    if (marker.name.indexOf(targetedName) == -1) {
      continue;
    }
    const duration = marker.end - marker.start;
    if (marker.name in result) {
      result[marker.name].push(duration)
    } else {
      result[marker.name] = [ duration ];
    }
  }
  return result;
}

(() => {
  const markerNames = [
    "RequestDecode", "RequestDemux", "RequestData",
    "CopyDemuxedData", "CopyDecodedData",
  ];
  let results = {};
  let shouldDisplayResult = false;
  for (let name of markerNames) {
    let dataSet = collectPlaybackMarkersDuration(name);
    Object.entries(dataSet).forEach(([key, data]) => {
      let result = {
        markerName: name,
        markerKey: key,
        mean: 0,
        median: 0,
        stddev: 0,
        variance: 0,
        durations: []
      };

      // Median
      let sortedData = data.slice();
      sortedData.sort((a, b) => a - b);
      result.median = sortedData[Math.floor(sortedData.length / 2)];

      // Average
      let sum = 0;
      for (let value of sortedData) {
        sum += value;
      }
      result.mean = sum / sortedData.length;

      // Variance
      for (let value of sortedData) {
        result.variance += Math.pow(value - result.mean, 2);
      }
      result.variance /= sortedData.length;
      result.stddev = Math.sqrt(result.variance);
      result.durations = data;

      if (name in results) {
        results[name].push(result)
      } else {
        results[name] = [ result ];
      }
      shouldDisplayResult = true;
    });
  }

  if (shouldDisplayResult) {
    console.log(results);
    plotPlaybackMarkers(results);
  }
})();
