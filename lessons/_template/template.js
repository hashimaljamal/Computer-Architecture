/*
 * Template for a new lesson. Copy this folder, rename it, then follow the steps
 * in the README ("Adding a lesson"). This file is not loaded by the site until
 * you list it in index.html.
 *
 * The rules that keep lessons from clashing with each other:
 *   - Fill only the panel you are given (mount(panel)). Look elements up with
 *     panel.querySelector(...), never document.getElementById(...), and avoid
 *     id="..." in your markup (use data-... attributes or classes).
 *   - Listen for events on the panel, not on document.
 *   - Prefix any SVG ids (for example id="tpl-arrow") because all lessons share one page.
 *   - Put your styles in your own .css file, nested under your lesson's class.
 *   - Layout: put your inputs in <div class="col-a"> and your results in <div class="col-b">,
 *     both inside <div class="split">. On big screens they sit side by side and the page fits
 *     the window; on small screens they stack. Set --left in your CSS to change the left width.
 *   - Colours: use the shared CSS variables from style.css (var(--tpri), var(--bd), ...)
 *     so your lesson follows the light/dark theme.
 */
(function () {
  'use strict';

  function mount(panel) {
    panel.classList.add('lesson-template');       // scope your CSS under this class
    panel.innerHTML = `
      <h2 class="lesson-title">Lesson title</h2>
      <div class="split">
        <div class="col-a">
          <label>Enter a number
            <input type="number" data-f="n" value="4">
          </label>
        </div>
        <div class="col-b">
          <p class="muted" data-o="answer"></p>
        </div>
      </div>
    `;

    var input = panel.querySelector('[data-f="n"]');
    var answer = panel.querySelector('[data-o="answer"]');

    function update() { answer.textContent = 'Twice that is ' + (2 * (+input.value || 0)); }
    panel.addEventListener('input', update);
    update();
  }

  // id: used in the address (#template); lowercase letters, digits and dashes only.
  // title: the text on the tab.
  Lessons.register({ id: 'template', title: 'Template', mount: mount });
})();
