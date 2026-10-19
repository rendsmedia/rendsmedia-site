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
  var form = document.querySelector('.form:not(.sample-form)');
  if (!form || !document.getElementById('f-type')) return;
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
  var photosSec = document.querySelector('.work-photos');
  var filmsSec = document.querySelector('.work-films');
  var state = { format: 'all', cat: 'all' };
  var cats = ['development', 'corporate', 'events'], formats = ['photos', 'films'];
  function apply() {
    buttons.forEach(function (b) {
      var on = state[b.getAttribute('data-group')] === b.getAttribute('data-filter');
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    [[photosSec, 'photos'], [filmsSec, 'films']].forEach(function (pair) {
      var sec = pair[0];
      if (!sec) return;
      var shown = 0;
      sec.querySelectorAll('[data-cat]').forEach(function (el) {
        var hide = state.cat !== 'all' && el.getAttribute('data-cat') !== state.cat;
        el.classList.toggle('is-filtered-out', hide);
        if (!hide) shown++;
      });
      var formatHidden = state.format !== 'all' && state.format !== pair[1];
      sec.classList.toggle('is-filtered-out', formatHidden || shown === 0);
    });
  }
  function writeHash() {
    var parts = [];
    if (state.format !== 'all') parts.push(state.format);
    if (state.cat !== 'all') parts.push(state.cat);
    history.replaceState(null, '', parts.length ? '#' + parts.join('-') : location.pathname);
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      state[b.getAttribute('data-group')] = b.getAttribute('data-filter');
      apply(); writeHash();
    });
  });
  (location.hash || '').replace('#', '').split('-').forEach(function (p) {
    if (cats.indexOf(p) > -1) state.cat = p;
    if (formats.indexOf(p) > -1) state.format = p;
  });
  apply();
})();

// Work page: tap a photo to see it large, with previous/next, arrow keys and swipe
(function () {
  var viewer = document.getElementById('viewer');
  var gallery = document.querySelector('.gallery--work');
  if (!viewer || !gallery || typeof viewer.showModal !== 'function') return;
  var img = viewer.querySelector('.viewer__img');
  var cap = viewer.querySelector('.viewer__caption');
  var count = viewer.querySelector('.viewer__count');
  var list = [], index = 0, opener = null;

  function visibleShots() {
    return Array.prototype.filter.call(gallery.querySelectorAll('.shot'), function (s) {
      return !s.classList.contains('is-filtered-out');
    });
  }
  function show(i) {
    index = (i + list.length) % list.length;
    var shot = list[index], small = shot.querySelector('img');
    var large = small.getAttribute('src').replace('/work/', '/work/large/');
    var caption = shot.querySelector('figcaption');
    img.classList.add('is-loading');
    img.onload = function () { img.classList.remove('is-loading'); };
    img.onerror = function () { img.onerror = null; img.src = small.getAttribute('src'); };
    img.src = large;
    img.alt = small.alt;
    cap.textContent = caption ? caption.textContent : '';
    count.textContent = (index + 1) + ' / ' + list.length;
    // warm up the next photo so swiping feels instant
    var next = list[(index + 1) % list.length].querySelector('img');
    (new Image()).src = next.getAttribute('src').replace('/work/', '/work/large/');
  }
  function open(shot) {
    list = visibleShots();
    opener = shot;
    show(list.indexOf(shot));
    viewer.showModal();
  }

  gallery.querySelectorAll('.shot').forEach(function (shot) {
    shot.setAttribute('tabindex', '0');
    shot.setAttribute('role', 'button');
    shot.setAttribute('aria-label', 'Enlarge photo: ' + (shot.querySelector('img').alt || 'photo'));
    shot.addEventListener('click', function () { open(shot); });
    shot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(shot); }
    });
  });

  viewer.querySelector('.viewer__close').addEventListener('click', function () { viewer.close(); });
  viewer.querySelector('.viewer__prev').addEventListener('click', function () { show(index - 1); });
  viewer.querySelector('.viewer__next').addEventListener('click', function () { show(index + 1); });
  viewer.addEventListener('click', function (e) {
    if (e.target === viewer || e.target.classList.contains('viewer__figure')) viewer.close();
  });
  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  viewer.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });

  var startX = null, startY = null;
  viewer.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

// Donors page: short sample brief request form
(function () {
  var form = document.getElementById('sample-form');
  if (!form) return;
  var started = document.getElementById('s-started');
  if (started) started.value = String(Date.now());
  var params = new URLSearchParams(window.location.search);
  if (params.get('sample') === 'sent') { document.getElementById('sample-sent').hidden = false; form.hidden = true; }
  if (params.get('sample') === 'error') { document.getElementById('sample-error').hidden = false; }
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

// Footer: always show the current year
(function () {
  var y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = y; });
})();
