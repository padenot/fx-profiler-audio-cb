var browser = browser || chrome;

async function doit(e) {
  // Scripts which should be loaded first.
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

browser.browserAction.onClicked.addListener(doit);
