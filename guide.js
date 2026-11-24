/*
 * guide.js - the "Lesson" button: a pop-up with the full lesson for a tab.
 *
 * A lesson registers its content:   Guide.register('<lesson id>', function () { return '<h3>...</h3>...'; })
 * Each <h3> becomes an entry in the contents bar at the top of the pop-up.
 * The pop-up is placed inside the lesson's own panel, so the lesson's styles apply to its pictures.
 */
(function () {
  'use strict';
  var content = {}, cache = {}, lastFocus = null;

  function register(id, fn) { content[id] = fn; }

  function close(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove('g-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function open(panel, id, from) {
    var fn = content[id];
    if (!fn) return;
    lastFocus = from || document.activeElement;
    var modal = panel.querySelector(':scope > .gmodal');
    if (!modal) {
      var title = (document.getElementById('tab-' + id) || {}).textContent || 'Lesson';
      modal = document.createElement('div');
      modal.className = 'gmodal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'g-' + id);
      var body;
      try { body = cache[id] || (cache[id] = fn()); }
      catch (err) { console.error(err); body = '<p class="err">This lesson could not be shown.</p>'; }
      modal.innerHTML = '<div class="gback" data-gclose></div><div class="gcard">' +
        '<header class="ghead"><h2 id="g-' + id + '">Lesson: ' + title + '</h2><button type="button" class="pb" data-gclose>Close ✕</button></header>' +
        '<nav class="gtoc" aria-label="Lesson contents"></nav><div class="gbody gtext" tabindex="0">' + body + '</div></div>';
      var toc = modal.querySelector('.gtoc');
      Array.prototype.forEach.call(modal.querySelectorAll('.gbody h3'), function (h, i) {
        h.id = 'g-' + id + '-' + i;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'pb'; b.textContent = h.textContent.replace(/^\d+\.\s*/, '');
        b.addEventListener('click', function () { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        toc.appendChild(b);
      });
      modal.addEventListener('click', function (e) { if (e.target.closest('[data-gclose]')) close(modal); });
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(modal); }
        if (e.key === 'Tab') {             // keep keyboard focus inside the pop-up
          var f = modal.querySelectorAll('button, [tabindex="0"]'), first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      panel.appendChild(modal);
    }
    modal.hidden = false;
    document.documentElement.classList.add('g-open');
    modal.querySelector('.gbody').scrollTop = 0;
    modal.querySelector('.ghead button').focus();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lesson]');
    if (!b) return;
    var panel = b.closest('.panel');
    if (panel) open(panel, panel.id.replace(/^panel-/, ''), b);
  });

  // the HTML of one lesson's guide (used by the Lessons page), or null
  function html(id) {
    if (!content[id]) return null;
    try { return cache[id] || (cache[id] = content[id]()); }
    catch (err) { console.error(err); return null; }
  }

  window.Guide = { register: register, open: open, html: html, has: function (id) { return !!content[id]; } };
})();
