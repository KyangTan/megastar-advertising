/* ============================================================
   GALLERY ADMIN MODE — owner-only curation tool
   Activate: gallery.html?admin=1 (persists for the browser session)

   - Multi-select tiles -> "Disable" (with confirm). Disabled images
     stop rendering; "Show Disabled" lists them with a Re-enable button.
   - Click a title to edit inline. Enter/blur saves, Escape cancels.
   - Edits persist in localStorage (this browser only). "Export"
     downloads the updated portfolio.json — commit & push it to
     publish the changes for everyone.
   ============================================================ */
(function(){
  "use strict";

  var LS_KEY = 'megastar_admin_v1';
  var SS_KEY = 'megastar_admin_session';

  /* ---------- activation (?admin=1, session-persisted) ---------- */
  try{
    if(new URLSearchParams(location.search).get('admin') === '1'){
      sessionStorage.setItem(SS_KEY, '1');
    }
  }catch(e){}
  var enabled = false;
  try{ enabled = sessionStorage.getItem(SS_KEY) === '1'; }catch(e){}
  if(!enabled) return;                 // visitors: zero footprint
  var gallery = document.getElementById('gallery');
  if(!gallery) return;

  /* ---------- persistent overlay ---------- */
  var overlay = { disabled: {}, titles: {} };
  try{
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if(saved && typeof saved === 'object'){
      overlay.disabled = saved.disabled || {};
      overlay.titles = saved.titles || {};
    }
  }catch(e){}

  function saveOverlay(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(overlay)); }catch(e){}
  }

  /* ---------- state ---------- */
  var meta = null;              // fetched portfolio data (mutated in place)
  var originalItems = null;     // snapshot of raw items
  var selected = {};            // id -> 1
  var showDisabled = false;
  var editingEl = null, editingId = null, editingOrig = null;

  /* ---------- hooks consumed by main.js ---------- */
  window.__applyAdminEdits = function(data){
    meta = data;
    originalItems = data.items.slice();
    data.items = data.items.filter(function(i){ return !overlay.disabled[i.id]; });
  };
  window.__adminDisplayTitle = function(item){
    return overlay.titles[item.id] != null ? overlay.titles[item.id] : null;
  };

  function refilterAndRender(){
    if(!meta || !originalItems) return;
    meta.items = originalItems.filter(function(i){ return !overlay.disabled[i.id]; });
    if(window.__megastarGallery) window.__megastarGallery.render();
  }

  /* ---------- toolbar ---------- */
  var bar = document.createElement('div');
  bar.className = 'admin-bar';
  document.body.appendChild(bar);
  document.body.classList.add('admin-on');

  bar.innerHTML =
    '<span class="admin-bar__count">0 selected</span>' +
    '<button type="button" class="admin-bar__btn admin-bar__btn--danger" data-act="disable" hidden>Disable Selected</button>' +
    '<button type="button" class="admin-bar__btn" data-act="showdisabled">Show Disabled</button>' +
    '<button type="button" class="admin-bar__btn" data-act="export">Export portfolio.json</button>' +
    '<button type="button" class="admin-bar__btn" data-act="clear">Clear local edits</button>' +
    '<span class="admin-bar__note">Edits live in this browser only — Export &amp; commit to publish</span>' +
    '<button type="button" class="admin-bar__btn admin-bar__btn--ghost" data-act="exit">Exit</button>';

  var countEl = bar.querySelector('.admin-bar__count');
  var disableBtn = bar.querySelector('[data-act="disable"]');
  var showBtn = bar.querySelector('[data-act="showdisabled"]');

  function disabledCount(){
    if(!originalItems) return 0;
    var n = 0;
    originalItems.forEach(function(i){ if(overlay.disabled[i.id]) n++; });
    return n;
  }

  function updateToolbar(){
    var n = Object.keys(selected).length;
    countEl.textContent = n + ' selected';
    disableBtn.hidden = n === 0;
    disableBtn.textContent = 'Disable ' + n + ' Image' + (n === 1 ? '' : 's');
    showBtn.textContent = (showDisabled ? 'Hide Disabled' : 'Show Disabled') +
      (disabledCount() ? ' (' + disabledCount() + ')' : '');
  }

  bar.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-act]');
    if(!btn) return;
    var act = btn.getAttribute('data-act');

    if(act === 'disable'){
      var ids = Object.keys(selected);
      if(!ids.length) return;
      if(!window.confirm('Disable ' + ids.length + ' image' + (ids.length === 1 ? '' : 's') +
          '? They will stop rendering until re-enabled (or removed by Export).')) return;
      ids.forEach(function(id){ overlay.disabled[id] = 1; });
      selected = {};
      saveOverlay();
      refilterAndRender();

    } else if(act === 'showdisabled'){
      showDisabled = !showDisabled;
      decorate();

    } else if(act === 'export'){
      exportJson();

    } else if(act === 'clear'){
      if(!window.confirm('Clear ALL local edits (disabled items + custom titles) in this browser?')) return;
      try{ localStorage.removeItem(LS_KEY); }catch(e){}
      location.reload();

    } else if(act === 'exit'){
      try{ sessionStorage.removeItem(SS_KEY); }catch(e){}
      location.reload();
    }
  });

  /* ---------- selection + title editing (capture phase) ----------
     Capture on the container fires before createItem's bubble-phase
     lightbox listener, so the lightbox never opens in admin mode. */
  gallery.addEventListener('click', function(e){
    // finish any in-progress title edit first; swallow the dismiss click
    if(editingEl){ finishEdit(); e.preventDefault(); e.stopPropagation(); return; }

    // re-enable buttons on disabled tiles
    var reen = e.target.closest('.admin-reenable');
    if(reen){
      e.preventDefault(); e.stopPropagation();
      var did = reen.closest('.pitem').getAttribute('data-id');
      if(did){ delete overlay.disabled[did]; saveOverlay(); refilterAndRender(); }
      return;
    }

    var tile = e.target.closest('.pitem');
    if(!tile) return;
    var id = tile.getAttribute('data-id');
    if(!id) return;
    e.preventDefault(); e.stopPropagation();

    // title editing
    var titleEl = e.target.closest('.pitem__title');
    if(titleEl && !tile.classList.contains('admin-disabled')){
      startEdit(titleEl, id);
      return;
    }

    // toggle selection
    if(selected[id]) delete selected[id]; else selected[id] = 1;
    tile.classList.toggle('admin-selected', !!selected[id]);
    updateToolbar();
  }, true);

  function startEdit(el, id){
    editingEl = el; editingId = id;
    editingOrig = el.textContent;
    el.setAttribute('contenteditable', 'true');
    el.classList.add('admin-editing');
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function finishEdit(revert){
    if(!editingEl) return;
    var el = editingEl, id = editingId, orig = editingOrig;
    editingEl = null; editingId = null; editingOrig = null;
    var val = (el.textContent || '').trim();
    el.removeAttribute('contenteditable');
    el.classList.remove('admin-editing');
    if(revert || !val || val === orig.trim()){
      el.textContent = orig;                 // revert: empty / unchanged / Escape
    } else {
      overlay.titles[id] = val;              // raw typed text — bypasses cleanTitle
      saveOverlay();
      el.textContent = val;
    }
  }

  gallery.addEventListener('keydown', function(e){
    if(!editingEl) return;
    if(e.key === 'Enter'){ e.preventDefault(); editingEl.blur(); }
    else if(e.key === 'Escape'){ e.preventDefault(); finishEdit(true); }
  }, true);

  gallery.addEventListener('focusout', function(){
    if(editingEl) finishEdit();
  });

  /* ---------- disabled tiles view ---------- */
  function activeFilter(){
    var b = document.querySelector('.filter.active');
    return b ? b.getAttribute('data-filter') : 'all';
  }

  function renderDisabledTiles(){
    if(!showDisabled || !originalItems) return;
    var f = activeFilter();
    originalItems.forEach(function(item){
      if(!overlay.disabled[item.id]) return;
      if(f !== 'all' && item.category !== f) return;
      var t = (overlay.titles[item.id] != null) ? overlay.titles[item.id] : item.title;
      var div = document.createElement('div');
      div.className = 'pitem admin-disabled';
      div.setAttribute('data-id', item.id);
      div.innerHTML =
        '<picture>' +
          (item.thumb_webp ? '<source srcset="' + item.thumb_webp + '" type="image/webp">' : '') +
          '<img src="' + item.thumb + '" alt="' + t + '" loading="lazy" />' +
        '</picture>' +
        '<div class="pitem__overlay">' +
          '<span class="pitem__cat">DISABLED — ' + item.category_label + '</span>' +
          '<span class="pitem__title">' + t + '</span>' +
          '<button type="button" class="admin-reenable">Re-enable</button>' +
        '</div>';
      gallery.appendChild(div);
    });
  }

  /* ---------- decorate after every render (filter, load-more, admin) ---------- */
  var observer = new MutationObserver(function(){
    requestAnimationFrame(decorate);
  });

  function decorate(){
    observer.disconnect();               // our own DOM writes must not re-trigger
    gallery.querySelectorAll('.pitem:not(.admin-disabled)').forEach(function(t){
      var id = t.getAttribute('data-id');
      t.classList.toggle('admin-selected', !!(id && selected[id]));
    });
    renderDisabledTiles();
    updateToolbar();
    observer.observe(gallery, { childList: true });
  }

  observer.observe(gallery, { childList: true });

  /* ---------- export ---------- */
  function exportJson(){
    if(!meta || !originalItems) return;
    var items = originalItems
      .filter(function(i){ return !overlay.disabled[i.id]; })
      .map(function(i){
        return overlay.titles[i.id] != null
          ? Object.assign({}, i, { title: overlay.titles[i.id] })
          : i;
      });
    var out = { categories: meta.categories, items: items, stats: meta.stats };
    var blob = new Blob([JSON.stringify(out, null, 2) + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }

})();
