/**
 * NJ-CII App Loader
 * Loads chunked JS and data files, then boots the application
 */
(async function() {
  var JS_PARTS = [
    'js/app_01.js', 'js/app_02.js', 'js/app_03.js',
    'js/app_04.js', 'js/app_05.js', 'js/app_06.js'
  ];
  
  try {
    // Load data manifest and all data chunks
    var manifestResp = await fetch('./data/manifest.json');
    var manifest = await manifestResp.json();
    
    var dataPromises = manifest.files.map(function(f) {
      return fetch('./data/' + f).then(function(r) { return r.json(); });
    });
    var chunks = await Promise.all(dataPromises);
    var allFirms = [].concat.apply([], chunks);
    
    // Store data globally for app.js to find
    window.__NJCII_FIRMS_DATA = allFirms;
    
    // Load all JS parts in order and concatenate
    var jsParts = [];
    for (var i = 0; i < JS_PARTS.length; i++) {
      var resp = await fetch('./' + JS_PARTS[i]);
      var text = await resp.text();
      jsParts.push(text);
    }
    
    // Combine and execute
    var fullScript = jsParts.join('\n');
    var scriptEl = document.createElement('script');
    scriptEl.textContent = fullScript;
    document.body.appendChild(scriptEl);
    
  } catch (err) {
    console.error('Failed to load application:', err);
    document.body.innerHTML = '<div style="padding:2rem;color:#f44;font-family:sans-serif;text-align:center;margin-top:4rem;"><h2>Application Loading Error</h2><p>Please refresh the page. If the problem persists, contact support.</p><p style="font-size:0.8rem;color:#888;">' + err.message + '</p></div>';
  }
})();
