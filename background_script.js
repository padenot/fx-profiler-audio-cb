var browser = browser || chrome;

function doit(e) {
  browser.tabs.executeScript({
    file: "/plotly.js"
  }).then(function() {
    browser.tabs.executeScript({
      file: "/graph.js"
    });
  });
}

browser.browserAction.onClicked.addListener(doit);
