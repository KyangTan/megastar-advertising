/* ============================================================
   CLIENTELE — D3 force-directed client network
   Central Megastar node linked to each client logo node.
   Logos render at their NATURAL aspect ratio at a uniform
   height — no circle crop, no background card. Draggable,
   hover-highlight, reset. Respects reduced motion.
   ============================================================ */
(function(){
  "use strict";
  if(!window.d3){ return; }            // CDN not available — bail quietly
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mount = document.getElementById('clienteleNetwork');
  if(!mount) return;

  /* All client logos in /assets/img/clientele */
  var CLIENTS = [
    "CLIENTS-01.jpg","CLIENTS-02.jpg","CLIENTS-03.jpg","CLIENTS-04.jpg",
    "CLIENTS-05.jpg","CLIENTS-06.jpg","CLIENTS-07.jpg","CLIENTS-08.jpg",
    "CLIENTS-010.jpg","CLIENTS-10.jpg","CLIENTS-11.jpg","CLIENTS-12.jpg",
    "CLIENTS-13.jpg","CLIENTS-14.jpg","CLIENTS-15.jpg","CLIENTS-16.jpg",
    "CLIENTS-17.jpg","CLIENTS-18.jpg","CLIENTS-19.jpg","CLIENTS-20.jpg",
    "CLIENTS-21.jpg","CLIENTS-22.jpg","CLIENTS-23.jpg"
  ];
  var BASE = 'assets/img/clientele/';

  /* Uniform logo height; width follows each image's natural ratio (capped). */
  var MAX_RATIO = 3.2;
  function nodeHFor(w){ return w < 760 ? 32 : 44; }   /* smaller logos on phones */
  var NODE_H = 44;

  /* Preload every logo so we know its natural aspect ratio up front. */
  var pre = CLIENTS.map(function(f){ var im = new Image(); im.src = BASE + f; return im; });
  var loaded = pre.filter(function(im){ return im.complete && im.naturalWidth; }).length;

  function ratioOf(im){
    if(im && im.naturalWidth && im.naturalHeight){
      return Math.min(im.naturalWidth / im.naturalHeight, MAX_RATIO);
    }
    return 2.4; /* fallback until measured */
  }

  function init(){
    var width = mount.clientWidth || 960;
    var height = mount.clientHeight || 540;
    var cx = width / 2, cy = height / 2;
    NODE_H = nodeHFor(width);

    var svg = d3.select(mount).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%').style('display', 'block');

    var ringR = Math.min(width, height) * 0.36;

    /* Central Megastar node (pinned at center) */
    var center = { id: 'megastar', center: true, x: cx, y: cy, fx: cx, fy: cy, r: 46 };

    /* Client nodes seeded on a ring; width follows natural ratio */
    var clients = CLIENTS.map(function(f, i){
      var ratio = ratioOf(pre[i]);
      var w = NODE_H * ratio;
      var ang = (i / CLIENTS.length) * Math.PI * 2;
      return {
        id: 'c' + i,
        src: BASE + f,
        w: w, h: NODE_H,
        r: w / 2 + 6,                 /* collision radius (width-based for wide logos) */
        x: cx + ringR * Math.cos(ang),
        y: cy + ringR * Math.sin(ang)
      };
    });

    var nodes = [center].concat(clients);
    var links = clients.map(function(c){ return { source: 'megastar', target: c.id }; });

    /* ---- Links ---- */
    var linkSel = svg.append('g').attr('class', 'cn-links')
      .selectAll('line').data(links).join('line')
      .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy);

    /* ---- Nodes ---- */
    var nodeSel = svg.append('g').attr('class', 'cn-nodes')
      .selectAll('g').data(nodes).join('g')
      .attr('class', 'cn-node')
      .attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'; });

    /* Center node: red disc + star glyph */
    var centerG = nodeSel.filter(function(d){ return d.center; });
    centerG.append('circle').attr('class', 'cn-center').attr('r', function(d){ return d.r; });
    centerG.append('text').attr('class', 'cn-center-glyph').attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central').text('★');

    /* Client nodes: raw logo at natural ratio, uniform height, no box */
    var clientG = nodeSel.filter(function(d){ return !d.center; });
    clientG.append('image')
      .attr('class', 'cn-logo')
      .attr('href', function(d){ return d.src; })
      .attr('xlink:href', function(d){ return d.src; })
      .attr('x', function(d){ return -d.w / 2; })
      .attr('y', function(d){ return -d.h / 2; })
      .attr('width', function(d){ return d.w; })
      .attr('height', function(d){ return d.h; })
      .attr('preserveAspectRatio', 'xMidYMid meet');

    /* ---- Drag (clients only) ---- */
    function dragStart(event, d){ if(!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d){ d.fx = event.x; d.fy = event.y; }
    function dragEnd(event, d){ if(!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
    clientG.call(d3.drag().on('start', dragStart).on('drag', dragged).on('end', dragEnd));

    /* ---- Hover highlight (pointer only) ---- */
    if(window.matchMedia('(pointer:fine)').matches){
      clientG.on('mouseenter', function(e, d){
        nodeSel.classed('dim', function(n){ return n !== d && !n.center; });
        linkSel.classed('hl', function(l){ return l.target.id === d.id; })
               .classed('dim', function(l){ return l.target.id !== d.id; });
      }).on('mouseleave', function(){
        nodeSel.classed('dim', false);
        linkSel.classed('hl', false).classed('dim', false);
      });
    }

    /* ---- Force simulation ---- */
    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function(d){ return d.id; })
        .distance(function(){ return ringR; }).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-240))
      .force('collide', d3.forceCollide().radius(function(d){ return d.r; }).strength(0.9))
      .force('x', d3.forceX(cx).strength(0.05))
      .force('y', d3.forceY(cy).strength(0.05))
      .alphaDecay(reduce ? 0.5 : 0.03)
      .velocityDecay(0.6);

    function tick(){
      /* Keep every client logo fully inside the stage (no clipping). */
      nodes.forEach(function(d){
        if(d.center) return;
        var hw = (d.w || d.r) / 2, hh = (d.h || d.r) / 2;
        d.x = Math.max(hw + 4, Math.min(width - hw - 4, d.x));
        d.y = Math.max(hh + 4, Math.min(height - hh - 4, d.y));
      });
      linkSel
        .attr('x1', function(d){ return d.source.x; })
        .attr('y1', function(d){ return d.source.y; })
        .attr('x2', function(d){ return d.target.x; })
        .attr('y2', function(d){ return d.target.y; });
      nodeSel.attr('transform', function(d){ return 'translate(' + d.x + ',' + d.y + ')'; });
    }
    simulation.on('tick', tick);
    if(reduce){ simulation.alpha(0).stop(); simulation.tick(300); tick(); }

    /* ---- Reset ---- */
    var resetBtn = document.getElementById('clienteleReset');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        clients.forEach(function(c, i){
          var ang = (i / clients.length) * Math.PI * 2;
          c.x = cx + ringR * Math.cos(ang);
          c.y = cy + ringR * Math.sin(ang);
          c.fx = null; c.fy = null; c.vx = 0; c.vy = 0;
        });
        if(reduce){ tick(); } else { simulation.alpha(1).restart(); }
      });
    }

    /* ---- Responsive: recenter on resize ---- */
    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){
        var w = mount.clientWidth || width;
        var h = mount.clientHeight || height;
        if(Math.abs(w - width) < 8 && Math.abs(h - height) < 8) return;
        width = w; height = h; cx = width/2; cy = height/2;
        /* Resize the logos too when crossing the mobile/desktop breakpoint */
        var newNodeH = nodeHFor(width);
        if(newNodeH !== NODE_H){
          NODE_H = newNodeH;
          clients.forEach(function(c, i){
            var ratio = Math.min((pre[i].naturalWidth / pre[i].naturalHeight) || 2.4, MAX_RATIO);
            c.w = NODE_H * ratio; c.h = NODE_H; c.r = c.w / 2 + 6;
          });
          clientG.select('image')
            .attr('x', function(d){ return -d.w / 2; })
            .attr('y', function(d){ return -d.h / 2; })
            .attr('width', function(d){ return d.w; })
            .attr('height', function(d){ return d.h; });
        }
        ringR = Math.min(width, height) * 0.36;
        center.x = cx; center.y = cy; center.fx = cx; center.fy = cy;
        svg.attr('viewBox', '0 0 ' + width + ' ' + height);
        simulation.force('x', d3.forceX(cx).strength(0.05));
        simulation.force('y', d3.forceY(cy).strength(0.05));
        if(reduce){ tick(); } else { simulation.alpha(0.6).restart(); }
      }, 220);
    });
  }

  /* Kick off once every logo has loaded (or errored). */
  function tryInit(){ if(loaded >= CLIENTS.length){ init(); } }
  pre.forEach(function(im){
    if(im.complete && im.naturalWidth) return;
    im.onload = function(){ loaded++; tryInit(); };
    im.onerror = function(){ loaded++; tryInit(); };
  });
  tryInit();
})();
