var browser = browser || chrome;

browser.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
  if (message.action === "runMarkerVisualization") {
    await markerVisualization();
  }
  if (message.action === "runPlaybackRestore") {
    playbackRestore();
  }
  if (message.action === "openTimelinePage") {
    browser.tabs.create({ url: "/timeline.html" }).then(tab => {
      browser.webNavigation.onCompleted.addListener(function onCompleted(info) {
        if (info.tabId === tab.id && info.frameId === 0) {
            // Separate regularMarkers and groupedMarkers
            const { regularMarkers, groupedMarkers } = message.data;
            browser.tabs.sendMessage(tab.id, { action: "loadMarkers", regularMarkers, groupedMarkers })
              .catch(console.error);
            browser.webNavigation.onCompleted.removeListener(onCompleted);
        }
      });
    });
  }
});

async function markerVisualization() {
  // Scripts which should be loaded first.
  console.log("markerVisualization");
  await browser.tabs.executeScript({
    file: "/plotly.js"
  });
  await browser.tabs.executeScript({
    file: "/graph.js"
  });
  // Scripts which don't have dependency.
  browser.tabs.executeScript({
    file: "/audio_budget.js"
  });
  browser.tabs.executeScript({
    file: "/playback_markers.js"
  });
}

function playbackRestore() {
  console.log("playbackRestore");
  browser.tabs.executeScript({
    file: "/playback_restore.js"
  });
}
