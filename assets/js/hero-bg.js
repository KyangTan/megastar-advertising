/* ============================================================
   HERO BACKGROUND — Particles, gradient mesh, cursor shine
   Respects prefers-reduced-motion.
   ============================================================ */
(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroSection = document.querySelector('.hero');
  if(!heroSection) return;

  /* ---------- Canvas particle system ---------- */
  var canvas = document.getElementById('heroParticles');
  if(canvas && !reduce){
    var ctx = canvas.getContext('2d');
    var particles = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COLORS = ['rgba(225,29,42,OP)','rgba(250,204,21,OP)','rgba(255,255,255,OP)'];

    function resize(){
      var rect = heroSection.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function Particle(){ this.reset(true); }
    Particle.prototype.reset = function(init){
      var w = canvas.width/dpr, h = canvas.height/dpr;
      this.x = Math.random()*w;
      this.y = init ? Math.random()*h : h+10;
      this.size = Math.random()*2.5+0.5;
      this.speed = Math.random()*0.6+0.15;
      this.opacity = Math.random()*0.5+0.1;
      this.drift = (Math.random()-0.5)*0.3;
      this.colorIdx = Math.floor(Math.random()*COLORS.length);
      this.flicker = Math.random()*Math.PI*2;
    };
    Particle.prototype.update = function(){
      this.y -= this.speed;
      this.x += this.drift;
      this.flicker += 0.05;
      if(this.y < -10) this.reset(false);
    };
    Particle.prototype.draw = function(){
      var op = this.opacity*(0.7+0.3*Math.sin(this.flicker));
      var c = COLORS[this.colorIdx].replace('OP', op.toFixed(3));
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      ctx.fillStyle = c;
      ctx.shadowBlur = this.size*4;
      ctx.shadowColor = c;
      ctx.fill();
    };

    function initParticles(){
      resize();
      var w = canvas.width/dpr;
      var count = Math.min(Math.floor(w/12), 60);
      particles = [];
      for(var i=0;i<count;i++) particles.push(new Particle());
    }

    var animating = false;
    function animate(){
      if(!animating) return;
      ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
      ctx.shadowBlur = 0;
      for(var i=0;i<particles.length;i++){ particles[i].update(); particles[i].draw(); }
      requestAnimationFrame(animate);
    }

    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting && !animating){ animating=true; animate(); }
          else if(!en.isIntersecting){ animating=false; }
        });
      });
      io.observe(heroSection);
    }
    initParticles(); animating=true; animate();

    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(initParticles,200); });
  }

  /* ---------- Hollow star cursor shine ---------- */
  var heroStar = document.getElementById('heroStar');
  if(heroStar){
    var starSection = heroStar.closest('section') || heroSection;

    if(window.matchMedia('(pointer:fine)').matches){
      starSection.addEventListener('mousemove', function(e){
        var rect = heroStar.getBoundingClientRect();
        var mx = ((e.clientX - rect.left) / rect.width) * 100;
        var my = ((e.clientY - rect.top) / rect.height) * 100;
        heroStar.style.setProperty('--mx', Math.max(0,Math.min(100,mx)) + '%');
        heroStar.style.setProperty('--my', Math.max(0,Math.min(100,my)) + '%');
        heroStar.classList.add('active');
      });
      starSection.addEventListener('mouseleave', function(){
        heroStar.classList.remove('active');
      });
    }

    /* Auto-shine drift for touch devices */
    if(window.matchMedia('(pointer:coarse)').matches && !reduce){
      var t = 0;
      (function drift(){
        t += 0.008;
        heroStar.style.setProperty('--mx', (50 + 35*Math.cos(t)) + '%');
        heroStar.style.setProperty('--my', (50 + 35*Math.sin(t*0.7)) + '%');
        heroStar.classList.add('active');
        requestAnimationFrame(drift);
      })();
    }
  }

})();
