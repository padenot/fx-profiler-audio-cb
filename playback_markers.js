const markerNames = [
  "RequestDecode:A", "RequestDecode:V", "RequestDemux", "RequestData",
  "CopyDemuxedData", "CopyDecodedData", "DecodeFrame",
];

// Some decoders will internally queue decoded outputs, and return them later
// when the amount of queued samples reaches a certain threshold. That makes
// the the duration of markers unprecise. Those markers would have significant
// overlap. We want to trim those overlapping in order to remove the queued time
// made by the decoder so that we can observe the true decoding time.
// See example in https://bugzilla.mozilla.org/show_bug.cgi?id=1894117#c1.
const makersNeedTrimming = [
  "RequestDecode", "DecodeFrame",
];

function isAdjustmentRequired(markerName) {
  for (let marker of makersNeedTrimming) {
    if (markerName.indexOf(markerName) != -1) {
      return true;
    }
  }
  return false;
}

function collectPlaybackMarkersDuration(targetedName) {
  let result = {};
  let markers = {};
  const categoryMediaPlayback = 16;
  for (let marker of window.wrappedJSObject.filteredMarkers) {
    if (marker.category != categoryMediaPlayback) {
      continue;
    }
    if (marker.name.indexOf(targetedName) == -1) {
      continue;
    }

    if (marker.name in markers) {
      markers[marker.name].push(marker)
    } else {
      markers[marker.name] = [ marker ];
    }
  }

  // Calulate duration per maker's name
  for (let name in markers) {
    const markerArray = markers[name];
    if (markerArray.length == 0) {
      continue;
    }
    result[name] = [ markerArray[0].end - markerArray[0].start ];
    for (let idx = 1; idx < markerArray.length; idx++) {
      const cur = markerArray[idx], prev = markerArray[idx - 1];
      if (isAdjustmentRequired(name) && prev.end > cur.start) {
        if (cur.data.sampleStartTimeUs != undefined &&
            cur.data.sampleEndTimeUs != undefined) {
        console.log(
          `${name}:[${cur.data.sampleStartTimeUs},${cur.data.sampleEndTimeUs}] :` +
          `trimed sample duration from ${cur.end - cur.start} to ${cur.end - prev.end}`);
        }
        result[name].push( cur.end - prev.end );
      } else {
        result[name].push( cur.end - cur.start );
      }
    }
  }

  return result;
}

(() => {
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
    plotPlaybackMarkers(results);
  }
})();
