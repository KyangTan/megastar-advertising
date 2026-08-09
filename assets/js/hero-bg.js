/* ============================================================
   HERO BACKGROUND — Sliding photo slideshow + torchlight name
   Auto-advances every 2s, sliding the next image in from the
   right. Pauses when off-screen. Respects prefers-reduced-motion.
   ============================================================ */
(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroSection = document.querySelector('.hero');
  if(!heroSection) return;

  /* ---------- Sliding background slideshow ---------- */
  var slides = heroSection.querySelectorAll('.hero__slide');
  if(slides.length > 1 && !reduce){
    var current = 0;
    var playing = true;

    function advance(){
      if(!playing) return;
      var next = (current + 1) % slides.length;

      // outgoing slide drifts left and fades
      slides[current].classList.remove('active');
      slides[current].classList.add('exit');

      // incoming slide arrives from the right
      slides[next].classList.add('active');

      // after the transition, drop the exited slide back to the
      // right-hand "ready" position (invisible, so the snap is hidden)
      (function(prev){ setTimeout(function(){ prev.classList.remove('exit'); }, 1000); })(slides[current]);

      current = next;
    }

    // Pause when the hero is scrolled out of view
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ playing = en.isIntersecting; });
      });
      io.observe(heroSection);
    }

    setInterval(advance, 5000);
  }

})();
