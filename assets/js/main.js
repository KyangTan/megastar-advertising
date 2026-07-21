/* ============================================================
   MEGASTAR ADVERTISING — Main JavaScript
   Handles: portfolio loading, filtering, lightbox, nav,
   counters, scroll reveal, mobile menu
   ============================================================ */
(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav shrink on scroll ---------- */
  var nav = document.getElementById('nav');
  function onScroll(){
    if(!nav) return;
    if(window.scrollY > 30){ nav.classList.add('scrolled'); }
    else{ nav.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var overlay = document.getElementById('overlay');
  if(burger && overlay){
    function setMenu(open){
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function(){
      setMenu(!document.body.classList.contains('menu-open'));
    });
    overlay.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ setMenu(false); });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
    });
  }

  /* ---------- Smooth anchor (with sticky offset) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(e){
      var id = link.getAttribute('href');
      if(id.length < 2) return;
      var target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({top:top, behavior: reduce ? 'auto' : 'smooth'});
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    reveals.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---------- Scrollspy ---------- */
  var sections = ['services','why','work','contact'].map(function(id){ return document.getElementById(id); }).filter(Boolean);
  var navlinks = document.querySelectorAll('.nav__links a');
  if('IntersectionObserver' in window && sections.length > 0){
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          navlinks.forEach(function(a){
            a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, {threshold:0.4, rootMargin:'-30% 0px -50% 0px'});
    sections.forEach(function(s){ spy.observe(s); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el){
    var to = parseFloat(el.getAttribute('data-to')) || 0;
    var suf = el.getAttribute('data-suf') || '';
    if(reduce){ el.textContent = to + suf; return; }
    var dur = 1400, start = null;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start)/dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(eased * to);
      el.textContent = val + suf;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('.count');
  if('IntersectionObserver' in window){
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ animateCount(en.target); cio.unobserve(en.target); }
      });
    }, {threshold:0.6});
    counters.forEach(function(c){ cio.observe(c); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Subtle card tilt (pointer only) ---------- */
  if(!reduce && window.matchMedia('(pointer:fine)').matches){
    document.querySelectorAll('.scard').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left)/r.width - 0.5;
        var py = (e.clientY - r.top)/r.height - 0.5;
        card.style.transform = 'translateY(-10px) rotateX(' + (-py*6) + 'deg) rotateY(' + (px*6) + 'deg)';
      });
      card.addEventListener('mouseleave', function(){ card.style.transform = ''; });
    });
  }

  /* ============================================================
     PORTFOLIO: Load from JSON, render, filter, lightbox
     ============================================================ */
  var gallery = document.getElementById('gallery');
  var isGalleryPage = window.location.pathname.indexOf('gallery') > -1 || document.querySelector('.gallery-hero');
  var PORTFOLIO_DATA = null;
  var activeFilter = 'all';
  var visibleCount = 0;
  var PAGE_SIZE = isGalleryPage ? 24 : 12;
  var lightboxIndex = 0;
  var lightboxItems = []; // currently visible items for lightbox nav

  // Clean up display titles
  function cleanTitle(title, categoryLabel){
    if(!title || title === categoryLabel) return categoryLabel;
    // Remove date prefixes like "2022-12-12 "
    var cleaned = title.replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
    // Remove "ADJUST", "AFTER", duplicate category suffixes
    cleaned = cleaned.replace(/\s+(ADJUST|AFTER|BEFORE)$/i, '');
    cleaned = cleaned.replace(/\s+\d+(\.\d+)?$/, ''); // trailing numbers
    // Remove redundant category mentions
    cleaned = cleaned.replace(/\s*(3D LED SIGNAGE|LED SIGNAGE|3D SIGNAGE|SIGNAGE|SIGN|METALBOARD|INKJET STICKER|WALLPAPER|WALL MURAL)$/i, '');
    cleaned = cleaned.trim();
    return cleaned || categoryLabel;
  }

  // Build a portfolio item element
  function createItem(item, index){
    var div = document.createElement('div');
    div.className = 'pitem' + (item.orientation === 'portrait' && index % 5 === 2 ? ' tall' : '');
    div.setAttribute('data-cat', item.category);
    div.setAttribute('data-index', index);

    var thumbSrc = item.thumb_webp || item.thumb;
    var fullSrc = item.full_webp || item.full;
    var displayTitle = cleanTitle(item.title, item.category_label);

    div.innerHTML =
      '<picture>' +
        (item.thumb_webp ? '<source srcset="' + item.thumb_webp + '" type="image/webp">' : '') +
        '<img src="' + item.thumb + '" alt="' + displayTitle + ' — ' + item.category_label + '" loading="lazy" />' +
      '</picture>' +
      '<div class="pitem__overlay">' +
        '<span class="pitem__cat">' + item.category_label + '</span>' +
        '<span class="pitem__title">' + displayTitle + '</span>' +
      '</div>';

    div.addEventListener('click', function(){
      openLightbox(index);
    });

    return div;
  }

  // Render the gallery with current filter
  function renderGallery(){
    if(!gallery || !PORTFOLIO_DATA) return;

    var filtered = activeFilter === 'all'
      ? PORTFOLIO_DATA.items
      : PORTFOLIO_DATA.items.filter(function(i){ return i.category === activeFilter; });

    // Show visibleCount items
    var toShow = filtered.slice(0, visibleCount);

    // Clear and rebuild
    gallery.innerHTML = '';
    lightboxItems = toShow;

    toShow.forEach(function(item, i){
      gallery.appendChild(createItem(item, i));
    });

    // Show/hide load more button
    var loadMoreWrap = document.getElementById('load-more-wrap');
    if(loadMoreWrap){
      if(visibleCount >= filtered.length){
        loadMoreWrap.style.display = 'none';
      } else {
        loadMoreWrap.style.display = 'block';
      }
    }

    // Update gallery count on gallery page
    var countEl = document.getElementById('gallery-count');
    if(countEl){
      countEl.textContent = filtered.length + ' Projects';
    }
  }

  // Filter buttons
  document.querySelectorAll('.filter').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.filter').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      visibleCount = PAGE_SIZE;
      renderGallery();
    });
  });

  // Load more button (gallery page)
  var loadMoreBtn = document.getElementById('load-more');
  if(loadMoreBtn){
    loadMoreBtn.addEventListener('click', function(){
      visibleCount += PAGE_SIZE;
      renderGallery();
    });
  }

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbCat = document.getElementById('lb-cat');
  var lbTitle = document.getElementById('lb-title');
  var lbCounter = document.getElementById('lb-counter');
  var lbClose = document.getElementById('lb-close');
  var lbPrev = document.getElementById('lb-prev');
  var lbNext = document.getElementById('lb-next');

  function openLightbox(index){
    lightboxIndex = index;
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateLightbox(){
    if(!lightboxItems.length) return;
    var item = lightboxItems[lightboxIndex];
    var fullSrc = item.full_webp || item.full;
    var displayTitle = cleanTitle(item.title, item.category_label);

    lbImg.src = fullSrc;
    lbImg.alt = displayTitle + ' — ' + item.category_label;
    lbCat.textContent = item.category_label;
    lbTitle.textContent = displayTitle;
    lbCounter.textContent = (lightboxIndex + 1) + ' / ' + lightboxItems.length;
  }

  function lbNav(dir){
    lightboxIndex = (lightboxIndex + dir + lightboxItems.length) % lightboxItems.length;
    updateLightbox();
  }

  if(lbClose) lbClose.addEventListener('click', closeLightbox);
  if(lbPrev) lbPrev.addEventListener('click', function(){ lbNav(-1); });
  if(lbNext) lbNext.addEventListener('click', function(){ lbNav(1); });
  if(lightbox) lightbox.addEventListener('click', function(e){
    if(e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e){
    if(!lightbox || !lightbox.classList.contains('open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') lbNav(-1);
    if(e.key === 'ArrowRight') lbNav(1);
  });

  /* ---------- Load portfolio data and render ---------- */
  // Try loading the JSON via fetch first, fall back to inline script
  var dataPath = 'assets/data/portfolio.json';

  // Determine relative path based on current page
  var pathParts = window.location.pathname.split('/');
  var fileName = pathParts[pathParts.length - 1];
  if(fileName === 'gallery.html' || fileName === ''){
    // Check if we're at site root or in a subdir
    if(window.location.pathname.indexOf('/site/') === -1 && window.location.pathname.indexOf('/gallery') > -1){
      dataPath = 'assets/data/portfolio.json';
    }
  }

  if(gallery){
    fetch(dataPath)
      .then(function(r){ return r.json(); })
      .then(function(data){
        PORTFOLIO_DATA = data;

        // For the homepage, curate: prefer titled items and diverse categories
        if(!isGalleryPage){
          // Pick best items: prefer titled, landscape, spread across categories
          var seen = {};
          var curated = [];
          // First pass: titled items, diverse categories
          data.items.forEach(function(item){
            var isTitled = item.title !== item.category_label;
            var key = item.category;
            if(isTitled){
              if(!seen[key]) seen[key] = 0;
              if(seen[key] < 4){
                curated.push(item);
                seen[key]++;
              }
            }
          });
          // Fill remaining with any items
          if(curated.length < 24){
            data.items.forEach(function(item){
              if(curated.indexOf(item) === -1 && curated.length < 24){
                curated.push(item);
              }
            });
          }
          PORTFOLIO_DATA.items = curated;
        }

        visibleCount = PAGE_SIZE;
        renderGallery();

        // Re-observe new reveal elements
        if('IntersectionObserver' in window && !reduce){
          var newIO = new IntersectionObserver(function(entries){
            entries.forEach(function(en){
              if(en.isIntersecting){ en.target.classList.add('in'); newIO.unobserve(en.target); }
            });
          }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
          document.querySelectorAll('.reveal:not(.in)').forEach(function(el){ newIO.observe(el); });
        }
      })
      .catch(function(err){
        console.error('Portfolio load error:', err);
        gallery.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">Gallery loading. Please run the image processor.</div>';
      });
  }

})();
