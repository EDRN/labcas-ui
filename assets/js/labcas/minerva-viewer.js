(function(window, document) {
  "use strict";

  var STORY_FIELDS = [
    "MinervaStoryURL",
    "MinervaStoryUrl",
    "MinervaStory",
    "MinervaExhibitURL",
    "MinervaExhibitUrl",
    "MinervaExhibit",
    "minerva_story_url",
    "minervaStoryUrl",
    "minerva_exhibit_url",
    "exhibit",
    "exhibitUrl"
  ];
  var SESSION_FIELDS = [
    "MinervaStorySessionURL",
    "MinervaStorySessionUrl",
    "MinervaSessionURL",
    "MinervaSessionUrl",
    "minerva_story_session_url",
    "minerva_session_url"
  ];
  var initPromise = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function html(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function getCookie(name) {
    var prefix = name + "=";
    var parts = String(document.cookie || "").split(";");
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i].trim();
      if (part.indexOf(prefix) === 0) {
        return decodeURIComponent(part.substring(prefix.length));
      }
    }
    return "";
  }

  function storageGet(key, fallback) {
    try {
      if (window.localStorage) {
        var value = window.localStorage.getItem(key);
        return value == null ? fallback : value;
      }
    } catch (e) {}
    return fallback;
  }

  function storageSet(key, value) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function setStatus(message) {
    var el = byId("minerva-status");
    if (el) {
      el.style.display = message ? "block" : "none";
      el.textContent = message || "";
    }
  }

  function normalizeItem(item) {
    if (!item) {
      return null;
    }
    if (Array.isArray(item)) {
      return {
        location: item[0] || "",
        name: item[1] || "",
        version: item[2] || "",
        id: item[3] || "",
        size: item[4] || "",
        source: "labcas"
      };
    }
    return item;
  }

  function readStoredItems() {
    var directId = getParam("file_id") || getParam("fileid");
    if (directId) {
      return [{
        id: directId,
        name: getParam("file_name") || directId.split("/").pop(),
        location: getParam("file_location") || "",
        size: getParam("file_size") || "",
        source: "labcas"
      }];
    }
    var raw = storageGet("labcas_minerva_files", "") || "[]";
    try {
      var parsed = JSON.parse(raw);
      return (Array.isArray(parsed) ? parsed : []).map(normalizeItem).filter(Boolean);
    } catch (e) {
      console.warn("Failed to parse Minerva items", e);
      return [];
    }
  }

  function findStoryUrl(value) {
    if (!value) {
      return "";
    }
    for (var i = 0; i < STORY_FIELDS.length; i += 1) {
      var key = STORY_FIELDS[i];
      if (value[key]) {
        return String(value[key]);
      }
    }
    if (value.metadata) {
      return findStoryUrl(value.metadata);
    }
    return "";
  }

  function findSessionUrl(value) {
    if (!value) {
      return "";
    }
    for (var i = 0; i < SESSION_FIELDS.length; i += 1) {
      var key = SESSION_FIELDS[i];
      if (value[key]) {
        return String(value[key]);
      }
    }
    if (value.metadata) {
      return findSessionUrl(value.metadata);
    }
    return "";
  }

  function globalStoryUrl() {
    var directFile = getParam("file_id") || getParam("fileid");
    return getParam("exhibit") ||
      getParam("story") ||
      (directFile ? "" : storageGet("labcas_minerva_story_url", "")) ||
      "";
  }

  function globalSessionUrl() {
    return getParam("story_session") ||
      getParam("session") ||
      "";
  }

  function solrQuote(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function authHeaders() {
    var headers = {};
    var token = getCookie("token") || storageGet("token", "") || storageGet("JasonWebToken", "") || "";
    if (token && token !== "None") {
      headers.Authorization = "Bearer " + token;
    }
    return headers;
  }

  function environmentUrl() {
    return (storageGet("environment", "") || window.location.origin || "").replace(/\/$/, "");
  }

  function hasConfiguredEnvironment() {
    return !!storageGet("environment", "");
  }

  function downloadUrl(item) {
    if (item && item.url) {
      return item.url;
    }
    if (!item || !item.id) {
      return "";
    }
    return environmentUrl() + "/data-access-api/download?id=" + encodeURIComponent(item.id);
  }

  async function fetchMetadata(item) {
    if (!item || !item.id) {
      return null;
    }
    if (!hasConfiguredEnvironment() && /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(window.location.hostname)) {
      return null;
    }
    if (typeof fetch !== "function") {
      return null;
    }
    var query = 'id:"' + solrQuote(item.id) + '"';
    var url = environmentUrl() + "/data-access-api/files/select?q=" + encodeURIComponent(query) + "&wt=json&rows=1";
    try {
      var response = await Promise.race([
        fetch(url, {
          credentials: "include",
          headers: authHeaders()
        }),
        new Promise(function(resolve) {
          window.setTimeout(function() { resolve(null); }, 5000);
        })
      ]);
      if (!response) {
        return null;
      }
      if (!response.ok) {
        return null;
      }
      var data = await response.json();
      var docs = data && data.response && data.response.docs ? data.response.docs : [];
      return docs[0] || null;
    } catch (e) {
      console.warn("Failed to fetch Minerva metadata", e);
      return null;
    }
  }

  async function fetchSessionExhibit(sessionUrl) {
    if (!sessionUrl || typeof fetch !== "function") {
      return "";
    }
    var url;
    try {
      url = new URL(sessionUrl, environmentUrl() || window.location.origin).toString();
    } catch (e) {
      url = sessionUrl;
    }
    try {
      var response = await fetch(url, {
        credentials: "include",
        headers: authHeaders()
      });
      if (!response.ok) {
        return "";
      }
      var data = await response.json();
      return data.exhibit ||
        data.exhibitUrl ||
        data.exhibit_url ||
        data.MinervaStoryURL ||
        data.MinervaExhibitUrl ||
        "";
    } catch (e) {
      console.warn("Failed to fetch Minerva session", e);
      return "";
    }
  }

  async function resolveStoryUrl(items) {
    var direct = globalStoryUrl();
    if (direct) {
      return direct;
    }
    var directSession = globalSessionUrl();
    var fromDirectSession = await fetchSessionExhibit(directSession);
    if (fromDirectSession) {
      return fromDirectSession;
    }
    for (var i = 0; i < items.length; i += 1) {
      var found = findStoryUrl(items[i]);
      if (found) {
        return found;
      }
      var session = findSessionUrl(items[i]);
      var fromSession = await fetchSessionExhibit(session);
      if (fromSession) {
        return fromSession;
      }
    }
    for (var j = 0; j < items.length; j += 1) {
      var doc = await fetchMetadata(items[j]);
      var fromDoc = findStoryUrl(doc);
      if (fromDoc) {
        return fromDoc;
      }
      var docSession = findSessionUrl(doc);
      var fromDocSession = await fetchSessionExhibit(docSession);
      if (fromDocSession) {
        return fromDocSession;
      }
    }
    return "";
  }

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      if (document.querySelector('script[src="' + src.replace(/"/g, '\\"') + '"]')) {
        resolve();
        return;
      }
      var settled = false;
      var timer = window.setTimeout(function() {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error("Timed out loading " + src));
      }, 20000);
      var script = document.createElement("script");
      script.src = src;
      script.onload = function() {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve();
      };
      script.onerror = function() {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        reject(new Error("Failed to load " + src));
      };
      document.head.appendChild(script);
    });
  }

  async function loadMinervaDependencies() {
    var browserJs = storageGet("minerva_browser_js_url", "") ||
      "/labcas-ui/assets/js/minerva/minerva-browser-3.19.6.bundle.dev.js";
    await loadScript(browserJs);
  }

  async function runMinerva(exhibitUrl) {
    if (isHtmlStoryUrl(exhibitUrl)) {
      runIframeStory(exhibitUrl);
      return;
    }
    setStatus("Loading Minerva story...");
    var browserEl = byId("minerva-browser");
    var fallbackEl = byId("minerva-fallback");
    if (fallbackEl) {
      fallbackEl.style.display = "none";
    }
    if (browserEl) {
      browserEl.style.display = "block";
      browserEl.innerHTML = "";
    }
    await loadMinervaDependencies();
    if (!window.MinervaStory || !window.MinervaStory.default || !window.MinervaStory.default.build_page) {
      throw new Error("Minerva browser did not initialize.");
    }
    window.labcasMinervaViewer = await window.MinervaStory.default.build_page({
      hideWelcome: true,
      authenticate: function() {
        return Promise.reject(new Error("Minerva story authentication is not configured in LabCAS."));
      },
      markerData: [],
      cellTypeData: [],
      speech_bucket: "",
      exhibit: exhibitUrl,
      id: "minerva-browser",
      embedded: true,
      customPushState: function() {
        var hash = this.makeHash(this.hashKeys);
        var current = new URL(window.location.href);
        current.searchParams.set("exhibit", exhibitUrl);
        current.hash = hash ? hash.substring(1) : "";
        var next = current.pathname + current.search + current.hash;
        if (this.url === next && !this.changed) {
          return;
        }
        history.replaceState(this.design, document.title, next);
        parent.postMessage({ href: window.location.origin + next }, "*");
        this.changed = false;
      }
    });
    setStatus("");
  }

  function isHtmlStoryUrl(url) {
    var value = String(url || "").toLowerCase().split("#")[0].split("?")[0];
    return value.endsWith(".html") || value.endsWith("/") || value.indexOf("exhibit.json") === -1;
  }

  function runIframeStory(url) {
    var browserEl = byId("minerva-browser");
    var fallbackEl = byId("minerva-fallback");
    setStatus("");
    if (fallbackEl) {
      fallbackEl.style.display = "none";
    }
    if (!browserEl) {
      return;
    }
    browserEl.style.display = "block";
    browserEl.innerHTML = '<iframe title="Minerva Story" src="' + html(url) + '" style="border:0;width:100%;height:100%;"></iframe>';
  }

  function renderFileList(items) {
    if (!items.length) {
      return "<p>No LabCAS files were passed to this viewer.</p>";
    }
    return [
      "<p>Selected LabCAS files:</p>",
      '<ul class="minerva-file-list">',
      items.map(function(item) {
        var url = downloadUrl(item);
        var name = item.name || item.id || url || "Untitled file";
        var label = url ? '<a href="' + html(url) + '" target="_blank" rel="noopener">' + html(name) + "</a>" : html(name);
        return "<li>" + label + "</li>";
      }).join(""),
      "</ul>"
    ].join("");
  }

  function showFallback(items, reason) {
    var browserEl = byId("minerva-browser");
    var fallbackEl = byId("minerva-fallback");
    setStatus("");
    if (browserEl) {
      browserEl.style.display = "none";
      browserEl.innerHTML = "";
    }
    if (!fallbackEl) {
      return;
    }
    fallbackEl.innerHTML = [
      "<h5>Minerva story assets are not available for this selection.</h5>",
      "<p>" + html(reason || "Minerva Story needs an exhibit.json file and tile pyramid generated from Minerva Author or Auto-Minerva before the browser can display the image.") + "</p>",
      renderFileList(items),
      '<p>To enable this path for LabCAS data, add a file or dataset metadata field such as <code>MinervaStoryURL</code> or <code>MinervaExhibitUrl</code> that points to a generated <code>exhibit.json</code>.</p>',
      '<div class="minerva-actions">',
      '<button id="minerva-demo" type="button" class="btn btn-secondary">Load Minerva Demo</button>',
      "</div>"
    ].join("");
    fallbackEl.style.display = "block";
    var demoBtn = byId("minerva-demo");
    if (demoBtn) {
      demoBtn.onclick = function() {
        runDemo();
      };
    }
  }

  function runDemo() {
    var demo = storageGet("minerva_demo_exhibit_url", "") ||
      "https://labsyspharm.github.io/minerva-story/";
    runMinerva(demo).catch(function(e) {
      showFallback(readStoredItems(), e.message || String(e));
    });
  }

  async function init() {
    var items = readStoredItems();
    if (getParam("demo") === "1") {
      runDemo();
      return;
    }
    var storyUrl = await resolveStoryUrl(items);
    if (!storyUrl) {
      showFallback(items, "The selected files appear to be raw LabCAS image files. Minerva cannot display raw SVS, QPTIFF, OME-TIFF, or DICOM directly without a generated Minerva Story.");
      return;
    }
    try {
      await runMinerva(storyUrl);
    } catch (e) {
      console.error("Minerva viewer failed", e && e.stack ? e.stack : e);
      showFallback(items, e.message || String(e));
    }
  }

  window.LabcasMinervaViewer = {
    init: function() {
      if (!initPromise) {
        initPromise = init();
      }
      return initPromise;
    },
    runDemo: runDemo
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.LabcasMinervaViewer.init);
  } else {
    window.setTimeout(window.LabcasMinervaViewer.init, 0);
  }
})(window, document);
