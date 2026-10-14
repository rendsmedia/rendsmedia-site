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
