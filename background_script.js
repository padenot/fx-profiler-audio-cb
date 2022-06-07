var browser = browser || chrome;

function doit(e) {
  browser.tabs.executeScript({
    file: "/plotly.js"
  }).then(function() {
    browser.tabs.executeScript({
      file: "/graph.js"
    });
    browser.tabs.executeScript({
      file: "/playback_markers.js"
    });
  });
}

browser.browserAction.onClicked.addListener(doit);
