document.getElementById('btn-marker-visualization').addEventListener('click', function() {
    browser.runtime.sendMessage({ action: "runMarkerVisualization" });
});

document.getElementById('btn-playback-restore').addEventListener('click', function() {
    browser.runtime.sendMessage({ action: "runPlaybackRestore" });
});
