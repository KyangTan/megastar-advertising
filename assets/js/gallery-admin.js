/* ============================================================
   GALLERY ADMIN MODE — owner-only curation tool
   Activate: gallery.html?admin=1 (persists for the browser session)

   - Multi-select tiles -> "Disable" (with confirm). Disabled images
     stop rendering; "Show Disabled" lists them with a Re-enable button.
   - Click a title to edit inline. Enter/blur saves, Escape cancels.
   - Click a category label to change the item's category (dropdown).
   - Hold (~0.5s) and drag a tile onto another to reorder globally.
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
  var overlay = { disabled: {}, titles: {}, cats: {}, order: null };
  try{
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if(saved && typeof saved === 'object'){
      overlay.disabled = saved.disabled || {};
      overlay.titles = saved.titles || {};
      overlay.cats = saved.cats || {};
      overlay.order = Array.isArray(saved.order) ? saved.order : null;
    }
  }catch(e){}

  function saveOverlay(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(overlay)); }catch(e){}
  }

  /* ---------- state ---------- */
  var meta = null;              // fetched portfolio data (mutated in place)
  var originalItems = null;     // snapshot of raw items (shared object refs)
  var selected = {};            // id -> 1
  var showDisabled = false;
  var editingEl = null, editingId = null, editingOrig = null;   // title edit
  var catEditing = null;                                        // category edit
  var drag = null;                                                 // drag state
  var suppressClick = false, swallowT = null;

  /* Swallow the click that follows a drag / edit-dismiss (see handlers) */
  function armSwallow(){
    suppressClick = true;
    clearTimeout(swallowT);
    swallowT = setTimeout(function(){ suppressClick = false; }, 350);
  }

  /* ---------- category helpers ---------- */
  var catSlugLabel = null;      // slug -> display label (built from meta)
  function catMap(){
    if(catSlugLabel || !meta) return catSlugLabel;
    catSlugLabel = {};
    var entries = [];
    Object.keys(meta.categories || {}).forEach(function(name){
      var c = meta.categories[name];
      if(c && c.slug) entries.push([c.slug, c.label || name]);
    });
    entries.sort(function(a, b){ return a[1] < b[1] ? -1 : 1; });
    entries.forEach(function(e){ catSlugLabel[e[0]] = e[1]; });
    return catSlugLabel;
  }

  /* Apply saved category overrides to item objects IN PLACE — the shared
     references mean tiles, lightbox and export all see the change. */
  function applyCatsToItems(){
    if(!originalItems) return;
    var map = catMap();
    if(!map) return;
    originalItems.forEach(function(i){
      var slug = overlay.cats[i.id];
      if(slug && map[slug] && slug !== i.category){
        i.category = slug;
        i.category_label = map[slug];
      }
    });
  }

  /* ---------- order helpers ---------- */
  /* Stable sort by first-occurrence rank in overlay.order; unknown ids
     keep relative order after all known ids. Idempotent after commit. */
  function applyOrder(items){
    if(!Array.isArray(overlay.order) || !overlay.order.length) return items;
    var rank = {};
    overlay.order.forEach(function(id, i){ if(rank[id] == null) rank[id] = i; });
    return items.slice().sort(function(a, b){
      var ra = rank[a.id], rb = rank[b.id];
      if(ra == null && rb == null) return 0;
      if(ra == null) return 1;
      if(rb == null) return -1;
      return ra - rb;
    });
  }

  /* ---------- hooks consumed by main.js ---------- */
  window.__applyAdminEdits = function(data){
    meta = data;
    var items = applyOrder(data.items.slice());
    originalItems = items;
    applyCatsToItems();
    data.items = items.filter(function(i){ return !overlay.disabled[i.id]; });
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
    '<span class="admin-bar__note">Title / category: click to edit · Tile: hold &amp; drag to reorder · Export &amp; commit to publish</span>' +
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
      if(!window.confirm('Clear ALL local edits (disabled items, custom titles, categories and ordering) in this browser?')) return;
      try{ localStorage.removeItem(LS_KEY); }catch(e){}
      location.reload();

    } else if(act === 'exit'){
      try{ sessionStorage.removeItem(SS_KEY); }catch(e){}
      location.reload();
    }
  });

  /* ---------- selection + title/category editing (capture phase) ----------
     Capture on the container fires before createItem's bubble-phase
     lightbox listener, so the lightbox never opens in admin mode. */
  gallery.addEventListener('click', function(e){
    // swallow the click that ends a drag / dismisses an editor
    if(suppressClick){ suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }

    // finish any in-progress category / title edit; swallow the dismiss click
    if(catEditing){ finishCatEdit(true); e.preventDefault(); e.stopPropagation(); return; }
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

    if(tile.classList.contains('admin-disabled')) return;  // disabled: re-enable button only

    // title editing
    var titleEl = e.target.closest('.pitem__title');
    if(titleEl){ startEdit(titleEl, id); return; }

    // category editing
    var catEl = e.target.closest('.pitem__cat');
    if(catEl){ startCatEdit(catEl, id); return; }

    // toggle selection
    if(selected[id]) delete selected[id]; else selected[id] = 1;
    tile.classList.toggle('admin-selected', !!selected[id]);
    updateToolbar();
  }, true);

  /* ---------- title editing ---------- */
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
    armSwallow();                     // the blur came from a click — swallow it
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

  /* ---------- category editing ---------- */
  function startCatEdit(catEl, id){
    if(catEditing) finishCatEdit(false);
    var map = catMap();
    if(!map || !originalItems) return;
    var item = null;
    originalItems.forEach(function(i){ if(!item && i.id === id) item = i; });
    if(!item) return;

    var select = document.createElement('select');
    select.className = 'admin-cat-select';
    Object.keys(map).forEach(function(slug){
      var o = document.createElement('option');
      o.value = slug;
      o.textContent = map[slug];
      if(slug === item.category) o.selected = true;
      select.appendChild(o);
    });
    catEl.classList.add('admin-cat-hidden');
    catEl.parentNode.insertBefore(select, catEl.nextSibling);
    catEditing = { span: catEl, select: select, id: id, origSlug: item.category };
    select.focus();

    select.addEventListener('change', function(){ finishCatEdit(true); });
    select.addEventListener('blur', function(){ finishCatEdit(true); });   // idempotent backstop
  }

  function finishCatEdit(commit){
    if(!catEditing) return;
    var c = catEditing;
    catEditing = null;
    armSwallow();                     // the blur came from a click — swallow it
    var slug = c.select.value;
    c.select.remove();
    c.span.classList.remove('admin-cat-hidden');
    if(commit && slug && slug !== c.origSlug){
      overlay.cats[c.id] = slug;
      saveOverlay();
      applyCatsToItems();             // mutate item objects in place
      refilterAndRender();            // item may leave the current filter view
    }
  }

  /* ---------- keyboard / focus routing ---------- */
  gallery.addEventListener('keydown', function(e){
    if(catEditing && e.key === 'Escape'){ e.preventDefault(); finishCatEdit(false); return; }
    if(!editingEl) return;
    if(e.key === 'Enter'){ e.preventDefault(); editingEl.blur(); }
    else if(e.key === 'Escape'){ e.preventDefault(); finishEdit(true); }
  }, true);

  gallery.addEventListener('focusout', function(){
    if(catEditing) finishCatEdit(true);
    if(editingEl) finishEdit();
  });

  /* ---------- drag-to-reorder (long press ~450ms) ---------- */
  /* data-id is NOT unique (2 duplicate pairs) — resolve tiles to items by
     DOM position: main.js renders meta.items (filtered) in order, so the
     k-th live tile is the k-th item of that list. */
  var tileItemMap = new WeakMap();

  function rebuildTileMap(){
    if(!meta) return;
    var f = activeFilter();
    var list = (f === 'all') ? meta.items
      : meta.items.filter(function(i){ return i.category === f; });
    var k = 0;
    Array.prototype.forEach.call(gallery.children, function(node){
      if(!node.classList || !node.classList.contains('pitem') ||
         node.classList.contains('admin-disabled')) return;
      if(k < list.length){ tileItemMap.set(node, list[k]); k++; }
    });
  }

  function engageDrag(state){
    state.engaged = true;
    try{ state.tile.setPointerCapture(state.pointerId); }catch(err){}
    var rect = state.tile.getBoundingClientRect();
    var ghost = state.tile.cloneNode(true);
    ghost.classList.add('admin-ghost');
    ghost.classList.remove('admin-selected');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);
    state.ghost = ghost;
    state.tile.classList.add('admin-dragging');
    document.body.style.userSelect = 'none';
    document.addEventListener('keydown', dragEscape);
  }

  function dragEscape(e){
    if(e.key === 'Escape' && drag){
      clearTimeout(drag.timer);
      teardownDrag(drag);
      drag = null;
      armSwallow();
    }
  }

  function moveGhost(x, y){
    if(!drag || !drag.ghost) return;
    var r = drag.ghost.getBoundingClientRect();
    drag.ghost.style.left = (x - r.width / 2) + 'px';
    drag.ghost.style.top = (y - r.height / 2) + 'px';
  }

  function updateDropTarget(x, y){
    if(!drag) return;
    var el = document.elementFromPoint(x, y);
    var t = el ? el.closest('.pitem') : null;
    var valid = t && t !== drag.tile &&
                !t.classList.contains('admin-disabled') &&
                !!tileItemMap.get(t);
    if(drag.target && drag.target !== t) drag.target.classList.remove('admin-drop-target');
    drag.target = valid ? t : null;
    if(drag.target) drag.target.classList.add('admin-drop-target');
  }

  function teardownDrag(state){
    if(state.ghost) state.ghost.remove();
    state.tile.classList.remove('admin-dragging');
    if(state.target) state.target.classList.remove('admin-drop-target');
    try{ state.tile.releasePointerCapture(state.pointerId); }catch(err){}
    document.body.style.userSelect = '';
    document.removeEventListener('keydown', dragEscape);
  }

  /* "Insert dragged before target" — dragged takes the target's grid slot
     in every view. Order snapshot = full id list of originalItems. */
  function commitReorder(draggedItem, targetItem){
    if(!draggedItem || !targetItem || draggedItem === targetItem) return;
    var from = originalItems.indexOf(draggedItem);
    if(from < 0) return;
    originalItems.splice(from, 1);
    var to = originalItems.indexOf(targetItem);
    if(to < 0){ originalItems.splice(from, 0, draggedItem); return; }
    originalItems.splice(to, 0, draggedItem);
    overlay.order = originalItems.map(function(i){ return i.id; });
    saveOverlay();
    refilterAndRender();
  }

  gallery.addEventListener('pointerdown', function(e){
    if(editingEl || catEditing || drag) return;
    if(e.button !== 0) return;
    // don't hijack presses meant for labels/buttons or disabled tiles
    if(e.target.closest('.pitem__title, .pitem__cat, .admin-reenable, .admin-cat-select')) return;
    var tile = e.target.closest('.pitem');
    if(!tile || tile.classList.contains('admin-disabled')) return;
    var item = tileItemMap.get(tile);
    if(!item) return;

    var state = {
      tile: tile, item: item, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      engaged: false, ghost: null, target: null, timer: 0
    };
    drag = state;
    state.timer = setTimeout(function(){
      if(drag === state) engageDrag(state);
    }, 450);
  });

  gallery.addEventListener('pointermove', function(e){
    if(!drag) return;
    if(!drag.engaged){
      var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if(dx * dx + dy * dy > 64){          // moved >8px — not a long press
        clearTimeout(drag.timer);
        drag = null;
      }
      return;
    }
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    updateDropTarget(e.clientX, e.clientY);
  });

  gallery.addEventListener('pointerup', function(e){
    if(!drag) return;
    var state = drag;
    clearTimeout(state.timer);
    drag = null;
    if(!state.engaged) return;             // quick click — let the click handler run
    e.preventDefault();
    var target = state.target;
    teardownDrag(state);                   // release capture BEFORE re-rendering
    if(target) commitReorder(state.item, tileItemMap.get(target));
    armSwallow();                          // swallow the synthesized click
  });

  gallery.addEventListener('pointercancel', function(){
    if(!drag) return;
    clearTimeout(drag.timer);
    teardownDrag(drag);
    drag = null;
    armSwallow();
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
    rebuildTileMap();                    // BEFORE disabled tiles are appended
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
