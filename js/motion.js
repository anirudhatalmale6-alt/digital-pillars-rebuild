/* =============================================================
   motion.js — Digital Pillars rebuild.
   Same engine as the sample, trimmed to what this page uses:
   reveals, the hero entrance, and magnetic buttons.

   API, all declared in the markup:
     data-reveal="rise|left|right|scale|mask"
     data-delay="0.15"          extra delay in seconds
     data-stagger="90"          on a parent: ms between children
     data-magnet                pull toward the pointer
   ============================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = matchMedia('(pointer: coarse)');

  var vh = window.innerHeight;
  var scrollY = window.scrollY;
  var pointer = { x: -9999, y: -9999, inside: false };
  var magnets = [];
  var pending = [];
  var running = true;

  function motionOn() { return root.dataset.motion === 'on'; }

  /* ─────────── reveals ─────────── */
  function assignStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (parent) {
      var step = parseFloat(parent.dataset.stagger) || 80, i = 0;
      Array.prototype.forEach.call(parent.children, function (child) {
        var t = child.hasAttribute('data-reveal') ? child : child.querySelector('[data-reveal]');
        if (!t) return;
        var own = parseFloat(t.dataset.delay) || 0;
        t.style.setProperty('--d', (own + (i * step) / 1000).toFixed(3) + 's');
        i++;
      });
    });
    document.querySelectorAll('[data-reveal][data-delay]').forEach(function (el) {
      if (!el.style.getPropertyValue('--d')) {
        el.style.setProperty('--d', parseFloat(el.dataset.delay) + 's');
      }
    });
  }

  function reveal(el) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    var d = parseFloat(el.style.getPropertyValue('--d')) || 0;
    setTimeout(function () { el.classList.add('is-settled'); }, 950 + d * 1000);
    observer.unobserve(el);
    var i = pending.indexOf(el);
    if (i > -1) pending.splice(i, 1);
  }

  var observer = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) reveal(e.target); });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  /* An IntersectionObserver samples once per frame, so an anchor jump can
     carry an element from below the fold to above it between two samples and
     it never fires. This sweep catches whatever the page already scrolled
     past; it runs only while things are still pending and empties itself. */
  var sweepAt = 0;
  function sweep(now) {
    if (!pending.length || now - sweepAt < 220) return;
    sweepAt = now;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < vh * 0.9) reveal(pending[i]);
    }
  }

  /* ─────────── hero ─────────── */
  function playHero() {
    var items = document.querySelectorAll('[data-hero-item]');
    items.forEach(function (el, i) {
      el.style.setProperty('--d', (0.1 + i * 0.1).toFixed(2) + 's');
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        items.forEach(function (el) { el.classList.add('is-in'); });
        setTimeout(function () {
          items.forEach(function (el) {
            el.style.willChange = 'auto';
            if (!el.classList.contains('line')) el.style.transform = '';
          });
        }, 2600);
      });
    });
  }

  /* ─────────── magnets ─────────── */
  function collect() {
    if (coarse.matches) return;          // pointer effects are desktop-only
    magnets = Array.prototype.map.call(document.querySelectorAll('[data-magnet]'), function (el) {
      return { el: el, label: el.querySelector('span'),
               strength: parseFloat(el.dataset.magnetStrength) || 0.35,
               x: 0, y: 0, tx: 0, ty: 0, active: false, cx: 0, w: 0, h: 0, top: 0 };
    });
  }

  function measure() {
    vh = window.innerHeight;
    var docTop = window.scrollY;
    magnets.forEach(function (m) {
      var r = m.el.getBoundingClientRect();
      m.cx = r.left + r.width / 2;
      m.w = r.width; m.h = r.height; m.top = r.top + docTop;
    });
  }

  /* ─────────── one frame loop for everything ─────────── */
  var lastT = 0;
  function frame(now) {
    if (!running) { lastT = 0; requestAnimationFrame(frame); return; }

    if (motionOn() && !reduced.matches) {
      for (var i = 0; i < magnets.length; i++) {
        var b = magnets[i];
        var by = b.top - scrollY;
        if (by + b.h < -100 || by > vh + 100) continue;
        var dx = pointer.x - b.cx, dy = pointer.y - (by + b.h / 2);
        var reach = Math.max(b.w, b.h) / 2 + 70;
        var dist = Math.hypot(dx, dy);
        if (pointer.inside && dist < reach) {
          var fall = 1 - dist / reach;
          b.tx = dx * b.strength * fall; b.ty = dy * b.strength * fall;
          if (!b.active) { b.active = true; b.el.classList.add('is-magnetised'); b.el.classList.remove('is-releasing'); }
        } else {
          b.tx = 0; b.ty = 0;
          if (b.active) { b.active = false; b.el.classList.remove('is-magnetised'); b.el.classList.add('is-releasing'); }
        }
        b.x += (b.tx - b.x) * 0.16;
        b.y += (b.ty - b.y) * 0.16;
        if (Math.abs(b.x) < 0.05 && Math.abs(b.y) < 0.05 && !b.active) {
          if (b.el.style.transform) b.el.style.transform = '';
        } else {
          b.el.style.transform = 'translate3d(' + b.x.toFixed(2) + 'px,' + b.y.toFixed(2) + 'px,0)';
          if (b.label) b.label.style.transform =
            'translate3d(' + (b.x * 0.26).toFixed(2) + 'px,' + (b.y * 0.26).toFixed(2) + 'px,0)';
        }
      }
    }

    sweep(now);
    lastT = now;
    requestAnimationFrame(frame);
  }

  /* ─────────── listeners record numbers, nothing else ─────────── */
  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('is-stuck', scrollY > 24);
  }, { passive: true });
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { pointer.inside = false; });
  window.addEventListener('blur', function () { pointer.inside = false; });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(measure, 140);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden; lastT = 0;
  });

  /* ─────────── boot ─────────── */
  function init() {
    clearTimeout(window.__motionFuse);
    collect();
    assignStagger();
    measure();

    if (reduced.matches) {
      root.dataset.motion = 'off';
    } else {
      root.dataset.motion = 'on';
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        pending.push(el); observer.observe(el);
      });
      playHero();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('load', measure);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
