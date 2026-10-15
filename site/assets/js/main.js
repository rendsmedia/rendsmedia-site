// Header: shadow once the page scrolls; mobile menu toggle
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');

  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (!toggle || !nav) return;
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
})();

// Film thumbnails open an embedded player instead of leaving the site
(function () {
  var dialog = document.getElementById('player');
  if (!dialog || typeof dialog.showModal !== 'function') return; // old browsers follow the YouTube link
  var frame = dialog.querySelector('.player__frame');
  var lastTrigger = null;
  function close() { dialog.close(); }
  dialog.addEventListener('close', function () { frame.innerHTML = ''; if (lastTrigger) lastTrigger.focus(); });
  dialog.querySelector('.player__close').addEventListener('click', close);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
  document.querySelectorAll('.film[data-video]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      lastTrigger = link;
      var id = encodeURIComponent(link.getAttribute('data-video'));
      var title = link.querySelector('.film__title');
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1" title="' +
        (title ? title.textContent.replace(/"/g, '&quot;') : 'Video') +
        '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      dialog.showModal();
    });
  });
})();

// Trusted by: on phones, turn the logo row into a slow rotating single line
(function () {
  var list = document.querySelector('.logos');
  if (!list || !list.children.length) return;
  var viewport = document.createElement('div');
  viewport.className = 'logos-viewport';
  list.parentNode.insertBefore(viewport, list);
  viewport.appendChild(list);
  // A second copy makes the loop seamless; hidden from screen readers
  Array.prototype.slice.call(list.children).forEach(function (li) {
    var copy = li.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.classList.add('logos__copy');
    list.appendChild(copy);
  });
  var mq = window.matchMedia('(max-width: 52rem)');
  function apply() { list.classList.toggle('is-marquee', mq.matches); }
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
})();

// Contact form: preselect from link, show audit questions, success/error notices, basic checks
(function () {
  var form = document.querySelector('.form');
  if (!form) return;
  var params = new URLSearchParams(window.location.search);
  var type = document.getElementById('f-type');
  var extra = document.getElementById('audit-extra');
  var started = document.getElementById('f-started');
  if (started) started.value = String(Date.now());

  var pre = params.get('enquiry');
  if (pre && type.querySelector('option[value="' + pre.replace(/[^a-z]/g, '') + '"]')) type.value = pre;
  function toggleExtra() { extra.hidden = type.value !== 'audit'; }
  type.addEventListener('change', toggleExtra);
  toggleExtra();

  if (params.get('sent')) { document.getElementById('notice-sent').hidden = false; form.hidden = true; }
  if (params.get('error')) { document.getElementById('notice-error').hidden = false; }

  form.addEventListener('submit', function (e) {
    var firstBad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) { e.preventDefault(); firstBad.focus(); }
  });
})();

// Work page: fresh random order on every visit, and category filters (also via #development etc.)
(function () {
  var shuffleBoxes = document.querySelectorAll('[data-shuffle]');
  if (!shuffleBoxes.length) return;
  shuffleBoxes.forEach(function (box) {
    var items = Array.prototype.slice.call(box.children);
    for (var i = items.length - 1; i > 0; i--) {
      var k = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[k]; items[k] = t;
    }
    // Keep large photos out of the last few spots so the grid ends without gaps
    if (box.classList.contains('gallery')) {
      var tail = 6, isBig = function (el) { return el.classList.contains('shot--wide'); };
      for (var n = items.length - tail; n < items.length; n++) {
        if (isBig(items[n])) {
          var moved = items.splice(n, 1)[0];
          items.splice(Math.floor(Math.random() * (items.length - tail)), 0, moved);
          n = items.length - tail - 1; // re-check the tail from the start
        }
      }
    }
    items.forEach(function (el) { box.appendChild(el); });
  });

  var buttons = document.querySelectorAll('.filter');
  var sections = [document.querySelector('.work-films'), document.querySelector('.work-photos')];
  function apply(cat) {
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-filter') === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    sections.forEach(function (sec) {
      if (!sec) return;
      var shown = 0;
      sec.querySelectorAll('[data-cat]').forEach(function (el) {
        var hide = cat !== 'all' && el.getAttribute('data-cat') !== cat;
        el.classList.toggle('is-filtered-out', hide);
        if (!hide) shown++;
      });
      sec.classList.toggle('is-filtered-out', shown === 0);
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-filter');
      apply(cat);
      history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
    });
  });
  var fromHash = (location.hash || '').replace('#', '');
  apply(['development', 'corporate', 'events'].indexOf(fromHash) > -1 ? fromHash : 'all');
})();

// YouTube thumbnails: some videos have no HD still; fall back to the standard one
(function () {
  document.querySelectorAll('.film__media img[src*="ytimg.com"]').forEach(function (img) {
    function check() {
      if (img.naturalWidth && img.naturalWidth <= 120 && img.src.indexOf('maxresdefault') > -1) {
        img.src = img.src.replace('maxresdefault', 'hqdefault');
      }
    }
    if (img.complete) check(); else img.addEventListener('load', check);
  });
})();
