/* ============================================================
   CLIENTELE — client logo network
   Square brand tiles sit on one even ring around the central
   Megastar mark. Lines, drag, hover, and the reset button
   match the previous network. The ring is an ellipse so the
   tiles use the stage and stay clear of each other and the
   edges on both desktop and mobile.
   ============================================================ */
(function(){
  "use strict";
  if(!window.d3){ return; }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mount = document.getElementById('clienteleNetwork');
  if(!mount) return;

  /* Upload order. Alt text is the brand name. */
  var CLIENTS = [
    { file: "xtraseal.webp", name: "X'traseal" },
    { file: "wonderful.webp", name: "Wonderful" },
    { file: "weber-saint-gobain.webp", name: "Weber Saint-Gobain" },
    { file: "total-one-stop-tools-station.webp", name: "TOTAL One-Stop Tools Station" },
    { file: "toa.webp", name: "TOA" },
    { file: "tambun-indah.webp", name: "Tambun Indah" },
    { file: "tah-wah.webp", name: "Tah Wah" },
    { file: "super-nice-by-unimax.webp", name: "Super Nice by Unimax" },
    { file: "stanley.webp", name: "Stanley" },
    { file: "soho.webp", name: "SOHO" },
    { file: "smart-paints.webp", name: "Smart Paints" },
    { file: "skk.webp", name: "SKK" },
    { file: "sika.webp", name: "Sika" },
    { file: "seqa.webp", name: "SEQA" },
    { file: "schott.webp", name: "SCHOTT" },
    { file: "san-cora-paint.webp", name: "SAN Cora Paint" },
    { file: "rock-oil.webp", name: "Rock Oil" },
    { file: "royal-county-of-berkshire-polo-club.webp", name: "Royal County of Berkshire Polo Club" },
    { file: "pentens.webp", name: "Pentens" },
    { file: "nippon-paint.webp", name: "Nippon Paint" },
    { file: "mici-quality-paint.webp", name: "Mici Quality Paint" },
    { file: "masterkids.webp", name: "Masterkids's" },
    { file: "mapei.webp", name: "Mapei" },
    { file: "kansai-paint.webp", name: "Kansai Paint" },
    { file: "federal-paint.webp", name: "Federal Paint" },
    { file: "dulux.webp", name: "Dulux" },
    { file: "cze-city-zone-express.webp", name: "CZE City Zone Express Sdn Bhd" },
    { file: "comfort-spring.webp", name: "Comfort Spring" },
    { file: "colourland-paints.webp", name: "Colourland Paints" }
  ];
  var BASE = 'assets/img/clientele/';
  var N = CLIENTS.length;

  /* Equal arc-length samples around an ellipse of radii rx, ry. */
  function ringPoints(rx, ry, n, offsetFrac){
    var steps = 1440;
    var xs = new Array(steps + 1);
    var ys = new Array(steps + 1);
    var cum = new Array(steps + 1);
    cum[0] = 0;
    for(var i = 0; i <= steps; i++){
      var a = (i / steps) * Math.PI * 2;
      xs[i] = rx * Math.cos(a);
      ys[i] = ry * Math.sin(a);
      if(i > 0){
        var dx = xs[i] - xs[i - 1];
        var dy = ys[i] - ys[i - 1];
        cum[i] = cum[i - 1] + Math.sqrt(dx * dx + dy * dy);
      }
    }
    var total = cum[steps];
    var pts = [];
    for(var k = 0; k < n; k++){
      var dist = ((offsetFrac + k / n) % 1) * total;
      var lo = 0, hi = steps;
      while(lo < hi){
        var mid = (lo + hi) >> 1;
        if(cum[mid] < dist) lo = mid + 1;
        else hi = mid;
      }
      var i1 = lo;
      var i0 = Math.max(0, i1 - 1);
      var x, y;
      if(cum[i1] === cum[i0]){ x = xs[i1]; y = ys[i1]; }
      else {
        var t = (dist - cum[i0]) / (cum[i1] - cum[i0]);
        x = xs[i0] + t * (xs[i1] - xs[i0]);
        y = ys[i0] + t * (ys[i1] - ys[i0]);
      }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function overlaps(a, b){
    return a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
  }

  /* Largest square that stays inside the stage, clears the centre
     mark, the reset button, and the rounded corners, with a gap. */
  function measure(width, height){
    var n = N;
    var pad = width < 760 ? 6 : 10;
    var gap = 6;
    var radius = 16; /* stage corner radius, plus a little slack */
    /* Full badge is larger than the old MS mark so the wordmark stays readable. */
    var centerR = width < 760 ? 86 : 108;
    var btn = { x0: width - 66, y0: 6, x1: width - 6, y1: 62 };
    var best = null;

    function trySize(S){
      var rx = width / 2 - pad - S / 2;
      var ry = height / 2 - pad - S / 2;
      if(rx < centerR + S / 2 + 12 || ry < centerR + S / 2 + 12) return null;
      var found = null;
      for(var s = 0; s < 36; s++){
        var offset = s / 36;
        var pts = ringPoints(rx, ry, n, offset);
        var ok = true;
        var minGap = Infinity;
        for(var i = 0; i < n; i++){
          var p = pts[i];
          var q = pts[(i + 1) % n];
          var cheb = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
          if(cheb < S + gap){ ok = false; break; }
          if(cheb - S < minGap) minGap = cheb - S;
          var dist = Math.sqrt(p.x * p.x + p.y * p.y);
          if(dist < centerR + S / 2 + 10){ ok = false; break; }
          var box = {
            x0: width / 2 + p.x - S / 2,
            y0: height / 2 + p.y - S / 2,
            x1: width / 2 + p.x + S / 2,
            y1: height / 2 + p.y + S / 2
          };
          if(box.x0 < pad || box.y0 < pad || box.x1 > width - pad || box.y1 > height - pad){ ok = false; break; }
          if(overlaps(box, btn)){ ok = false; break; }
          var corners = [[radius, radius], [width - radius, radius], [radius, height - radius], [width - radius, height - radius]];
          var samples = [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]];
          for(var c = 0; c < corners.length && ok; c++){
            for(var u = 0; u < samples.length; u++){
              var sx = samples[u][0], sy = samples[u][1];
              var inX = (c % 2 === 0) ? sx < radius : sx > width - radius;
              var inY = c < 2 ? sy < radius : sy > height - radius;
              if(!inX || !inY) continue;
              var dx = sx - corners[c][0], dy = sy - corners[c][1];
              if(dx * dx + dy * dy > radius * radius){ ok = false; break; }
            }
          }
          if(!ok) break;
        }
        if(!ok) continue;
        if(!found || minGap > found.minGap){
          found = { S: S, rx: rx, ry: ry, offset: offset, centerR: centerR, minGap: minGap };
        }
      }
      return found;
    }

    var lo = 16, hi = Math.floor(Math.min(width, height) / 3);
    while(lo <= hi){
      var mid = (lo + hi) >> 1;
      var fit = trySize(mid);
      if(fit){ best = fit; lo = mid + 1; }
      else hi = mid - 1;
    }
    return best || { S: 18, rx: width * 0.28, ry: height * 0.28, offset: 0, centerR: centerR, minGap: 0 };
  }

  var pre = CLIENTS.map(function(c){
    var im = new Image();
    im.alt = c.name;
    im.src = BASE + c.file;
    return im;
  });

  function init(){
    var width = mount.clientWidth || 960;
    var height = mount.clientHeight || 540;
    var geom = measure(width, height);
    var cx = width / 2, cy = height / 2;

    function slotsFor(g){
      return ringPoints(g.rx, g.ry, N, g.offset).map(function(p){
        return { x: cx + p.x, y: cy + p.y };
      });
    }
    var slots = slotsFor(geom);

    var center = {
      id: 'megastar', center: true,
      x: cx, y: cy, fx: cx, fy: cy, r: geom.centerR
    };
    var clients = CLIENTS.map(function(c, i){
      var slot = slots[i];
      var start = inward(slot, 0.42);
      return {
        id: 'c' + i,
        i: i,
        name: c.name,
        src: BASE + c.file,
        s: geom.S,
        x: start.x,
        y: start.y
      };
    });
    var nodes = [center].concat(clients);
    var links = clients.map(function(c){ return { source: 'megastar', target: c.id }; });

    function inward(slot, frac){
      return {
        x: cx + (slot.x - cx) * frac,
        y: cy + (slot.y - cy) * frac
      };
    }
    function slotOf(d){ return slots[d.i]; }

    var svg = d3.select(mount).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Client brands linked to Megastar')
      .style('width', '100%').style('height', '100%').style('display', 'block');

    var linkSel = svg.append('g').attr('class', 'cn-links').attr('aria-hidden', 'true')
      .selectAll('line').data(links).join('line')
      .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy);

    var nodeSel = svg.append('g').attr('class', 'cn-nodes')
      .selectAll('g').data(nodes).join('g')
      .attr('class', 'cn-node')
      .attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'; });

    var centerG = nodeSel.filter(function(d){ return d.center; });
    var badge = centerG.append('image')
      .attr('class', 'cn-center-badge')
      .attr('role', 'img')
      .attr('aria-label', 'Megastar Advertising Signcraft')
      .attr('href', 'assets/img/logo/megastar-center-badge.webp')
      .attr('xlink:href', 'assets/img/logo/megastar-center-badge.webp')
      .attr('width', geom.centerR * 2)
      .attr('height', geom.centerR * 2)
      .attr('x', -geom.centerR)
      .attr('y', -geom.centerR)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    badge.append('title').text('Megastar Advertising Signcraft');

    var clientG = nodeSel.filter(function(d){ return !d.center; });
    var logos = clientG.append('image')
      .attr('class', 'cn-logo')
      .attr('role', 'img')
      .attr('aria-label', function(d){ return d.name; })
      .attr('href', function(d){ return d.src; })
      .attr('xlink:href', function(d){ return d.src; })
      .attr('x', function(d){ return -d.s / 2; })
      .attr('y', function(d){ return -d.s / 2; })
      .attr('width', function(d){ return d.s; })
      .attr('height', function(d){ return d.s; })
      .attr('preserveAspectRatio', 'xMidYMid meet');
    logos.append('title').text(function(d){ return d.name; });

    function applyLogoSize(){
      clientG.select('image.cn-logo')
        .attr('x', function(d){ return -d.s / 2; })
        .attr('y', function(d){ return -d.s / 2; })
        .attr('width', function(d){ return d.s; })
        .attr('height', function(d){ return d.s; });
      centerG.select('image.cn-center-badge')
        .attr('width', center.r * 2)
        .attr('height', center.r * 2)
        .attr('x', -center.r)
        .attr('y', -center.r);
    }

    var introTimer = null;
    function stopIntro(){ if(introTimer){ introTimer.stop(); introTimer = null; } }

    function dragStart(event, d){
      stopIntro();
      if(!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
      d3.select(this).classed('dragging', true);
    }
    function dragged(event, d){ d.fx = event.x; d.fy = event.y; }
    function dragEnd(event, d){
      if(!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
      d3.select(this).classed('dragging', false);
    }
    clientG.call(d3.drag().on('start', dragStart).on('drag', dragged).on('end', dragEnd));

    if(window.matchMedia('(pointer:fine)').matches){
      clientG.on('mouseenter', function(e, d){
        nodeSel.classed('dim', function(n){ return n !== d && !n.center; });
        linkSel.classed('hl', function(l){ return (l.target.id || l.target) === d.id; })
               .classed('dim', function(l){ return (l.target.id || l.target) !== d.id; });
      }).on('mouseleave', function(){
        nodeSel.classed('dim', false);
        linkSel.classed('hl', false).classed('dim', false);
      });
    }

    var simulation = d3.forceSimulation(nodes)
      .force('slot', function(alpha){
        clients.forEach(function(c){
          if(c.fx != null) return;
          var t = slotOf(c);
          c.vx += (t.x - c.x) * 0.85 * alpha;
          c.vy += (t.y - c.y) * 0.85 * alpha;
        });
      })
      .force('collide', d3.forceCollide().radius(function(d){
        return d.center ? d.r + 4 : d.s / 2 + 2;
      }).strength(0.9).iterations(2))
      .force('charge', d3.forceManyBody().strength(function(d){ return d.center ? 0 : -18; }))
      .alphaDecay(reduce ? 1 : 0.028)
      .alphaMin(0.02)
      .velocityDecay(0.5);

    function clamp(d){
      var h = (d.s || 0) / 2 + 2;
      d.x = Math.max(h, Math.min(width - h, d.x));
      d.y = Math.max(h, Math.min(height - h, d.y));
    }
    function tick(){
      clients.forEach(clamp);
      linkSel
        .attr('x1', function(d){ return d.source.x; })
        .attr('y1', function(d){ return d.source.y; })
        .attr('x2', function(d){ return d.target.x; })
        .attr('y2', function(d){ return d.target.y; });
      nodeSel.attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'; });
    }
    simulation.on('tick', tick);
    simulation.on('end', function(){
      clients.forEach(function(c){
        if(c.fx != null) return;
        var t = slotOf(c);
        c.x = t.x; c.y = t.y; c.vx = 0; c.vy = 0;
      });
      tick();
    });
    simulation.stop();

    /* Logos travel out along their lines, then rest on the ring.
       Drag releases back into the same force simulation. */
    function playIntro(){
      stopIntro();
      simulation.stop();
      clients.forEach(function(c){
        c.fx = null; c.fy = null; c.vx = 0; c.vy = 0;
      });
      if(reduce){
        clients.forEach(function(c){
          var t = slotOf(c);
          c.x = t.x; c.y = t.y;
        });
        tick();
        return;
      }
      introTimer = d3.timer(function(elapsed){
        var u = Math.min(1, elapsed / 1200);
        var eased = 1 - Math.pow(1 - u, 3);
        var frac = 0.34 + 0.66 * eased;
        clients.forEach(function(c){
          if(c.fx != null) return;
          var t = slotOf(c);
          c.x = cx + (t.x - cx) * frac;
          c.y = cy + (t.y - cy) * frac;
          c.vx = 0; c.vy = 0;
        });
        tick();
        if(u >= 1){
          stopIntro();
          clients.forEach(function(c){
            if(c.fx != null) return;
            var t = slotOf(c);
            c.x = t.x; c.y = t.y;
          });
          tick();
        }
      });
    }
    playIntro();

    var resetBtn = document.getElementById('clienteleReset');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){ playIntro(); });
    }

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){
        var w = mount.clientWidth || width;
        var h = mount.clientHeight || height;
        if(Math.abs(w - width) < 8 && Math.abs(h - height) < 8) return;
        width = w; height = h; cx = width / 2; cy = height / 2;
        geom = measure(width, height);
        slots = slotsFor(geom);
        center.x = cx; center.y = cy; center.fx = cx; center.fy = cy; center.r = geom.centerR;
        clients.forEach(function(c){ c.s = geom.S; });
        applyLogoSize();
        svg.attr('viewBox', '0 0 ' + width + ' ' + height);
        stopIntro();
        if(reduce){
          clients.forEach(function(c){
            var t = slotOf(c);
            c.x = t.x; c.y = t.y;
          });
          tick();
        } else {
          simulation.alpha(0.8).restart();
        }
      }, 180);
    });
  }

  var pending = CLIENTS.length;
  function ready(){
    pending--;
    if(pending <= 0) init();
  }
  pre.forEach(function(im){
    if(im.complete){ ready(); return; }
    im.addEventListener('load', ready, { once: true });
    im.addEventListener('error', ready, { once: true });
  });
})();
