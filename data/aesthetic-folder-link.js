// ============================================================================
// aesthetic-folder-link.js — v0.1.0 (2026-08-20)
// "📂 Folder" pill in the Cinema Aesthetic header: opens the active project's
// workspace folder in Finder via the `sonor-open://` URL scheme.
//
// DATA-DRIVEN (no hardcoded projects): shows only when the active project's
// `projects.metadata.workspace_folder` is set — a path RELATIVE to the Sonor
// workspace root, e.g. "APP - Cinema Aesthetic/greystones".
//
// Requires the one-time Mac helper: `bash scripts/install-sonor-open-helper.sh`
// (registers a tiny "Sonor Open.app" handling sonor-open:// → Finder, locked
// to paths inside ~/Code/Sonor). Without the helper the click is a no-op and
// the pill shows a hint toast instead.
//
// House pattern: app-local data module (IIFE), no globals beyond SonorFolderLink.
// ============================================================================
(function () {
  'use strict';
  var VERSION = '0.1.0';
  var _folder = null;   // relative workspace path for the active project
  var _pid = null;
  var _client = null;

  function client() {
    if (_client) return _client;
    try { if (window.SonorDB) _client = (window.__sonorDbShared = window.__sonorDbShared || new window.SonorDB()).client; }
    catch (e) { /* no client — pill stays hidden */ }
    return _client;
  }

  async function refresh(pid) {
    _pid = pid || null; _folder = null;
    var db = client();
    if (db && _pid) {
      try {
        var r = await db.from('projects').select('metadata').eq('id', _pid).maybeSingle();
        var wf = r && r.data && r.data.metadata && r.data.metadata.workspace_folder;
        if (wf && typeof wf === 'string') _folder = wf.replace(/^\/+|\/+$/g, '');
      } catch (e) { /* offline — hidden */ }
    }
    render();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1c1e22;color:#e8e2d6;padding:9px 16px;border-radius:8px;font:12px/1.4 sans-serif;z-index:99999;box-shadow:0 4px 18px rgba(0,0,0,.4);max-width:80vw';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 5000);
  }

  function open() {
    if (!_folder) return;
    location.href = 'sonor-open://' + encodeURIComponent(_folder);
    toast('Opening in Finder… if nothing happens, run scripts/install-sonor-open-helper.sh once (right-click the pill to copy the path).');
  }

  function copyPath(ev) {
    ev.preventDefault();
    if (!_folder) return;
    var full = '~/Code/Sonor/' + _folder;
    (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject())
      .then(function () { toast('Path copied: ' + full); })
      .catch(function () { toast(full); });
  }

  function render() {
    var pill = document.getElementById('folderLinkPill');
    if (!_folder) { if (pill) pill.remove(); return; }
    if (!pill) {
      var anchor = document.getElementById('hdrVer');
      if (!anchor || !anchor.parentNode) { setTimeout(render, 800); return; }
      pill = document.createElement('a');
      pill.id = 'folderLinkPill';
      pill.href = '#';
      pill.style.cssText = 'margin-left:10px;cursor:pointer;text-decoration:none;font-size:12px;opacity:.85';
      pill.addEventListener('click', function (e) { e.preventDefault(); open(); });
      pill.addEventListener('contextmenu', copyPath);
      anchor.parentNode.insertBefore(pill, anchor.nextSibling);
    }
    pill.textContent = '📂 Folder';
    pill.title = 'Open "' + _folder + '" in Finder (right-click: copy path)';
  }

  function boot() {
    var bus = window.SonorProjectBus;
    if (bus && bus.subscribe) bus.subscribe(function (d) { refresh(d && d.currentId); });
    refresh(bus && bus.get ? bus.get() : null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SonorFolderLink = { version: VERSION, refresh: refresh };
})();
