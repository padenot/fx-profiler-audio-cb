(() => {


function processMarkers(markers, module) {
  const startTimestamp = window.wrappedJSObject.filteredMarkers[0].start;
  const categoryMediaPlayback = 16;
  let results = [];
  for (const marker of markers) {
    if (marker.name.indexOf("LogMessages") == 0) {
      if (!marker.data) {
        continue;
      }
      if (marker.data.module !== module) {
        continue;
      }
    } else if (marker.category != categoryMediaPlayback) {
      continue;
    }

    // Create a shallow copy of the marker to avoid modifying the original
    let modifiedMarker = Object.assign({}, marker);

    // If marker.data is an object and needs to be copied independently
    if (marker.data) {
      modifiedMarker.data = Object.assign({}, marker.data);
    }

    // Adjust the timestamp and convert to seconds
    modifiedMarker.start = (marker.start - startTimestamp) / 1000;
    if (modifiedMarker.name === "LogMessages" && marker.data) {
      modifiedMarker.name = modifiedMarker.data.module;
    }
    results.push(modifiedMarker);
  }
  console.log(results);
  return results;
}

function openTimelinePage(filteredMarkers) {
  browser.runtime.sendMessage({
    action: "openTimelinePage",
    data: filteredMarkers  // assuming 'filteredMarkers' are the markers you filtered
});
}

console.log(window.wrappedJSObject.filteredMarkers);
let markers = processMarkers(window.wrappedJSObject.filteredMarkers, "HTMLMediaElement");
// markers = markers.concat(processMarkers(window.wrappedJSObject.filteredMarkers, "MediaSource"));
openTimelinePage(markers);

})();

