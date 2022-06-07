
function collectPlaybackMarkerDuration(targetedName) {
  let result = {};
  const categoryMediaPlayback = 16;
  for (let marker of window.wrappedJSObject.filteredMarkers) {
    if (marker.category != categoryMediaPlayback) {
      continue;
    }
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

console.log("In the playback marker script!")