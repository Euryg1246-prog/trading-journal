// ============================================================
// DYGPRO — Ventanas ajustables (redimensionar + reordenar)
// Capa adicional, no modifica app.js / Supabase / lógica existente.
// Persistencia: solo localStorage (por navegador).
// ============================================================
(function () {
  var ORDER_KEY = 'dygpro_layout_order';
  var SIZES_KEY = 'dygpro_layout_sizes';

  function getOrder() {
    try {
      var arr = JSON.parse(localStorage.getItem(ORDER_KEY));
      return Array.isArray(arr) ? arr : null;
    } catch (e) { return null; }
  }

  function saveOrder(order) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (e) {}
  }

  function getSizes() {
    try {
      var obj = JSON.parse(localStorage.getItem(SIZES_KEY));
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { return {}; }
  }

  function saveSize(key, height) {
    var sizes = getSizes();
    sizes[key] = height;
    try { localStorage.setItem(SIZES_KEY, JSON.stringify(sizes)); } catch (e) {}
  }

  function applySavedOrder(main) {
    var order = getOrder();
    if (!order) return;
    var blocks = {};
    main.querySelectorAll(':scope > .dyg-block').forEach(function (el) {
      blocks[el.getAttribute('data-block-id')] = el;
    });
    order.forEach(function (id) {
      var el = blocks[id];
      if (el) main.appendChild(el);
    });
  }

  function applySavedSizes() {
    var sizes = getSizes();
    document.querySelectorAll('.dyg-resizable').forEach(function (el) {
      var key = el.getAttribute('data-resize-id') || el.id;
      if (key && sizes[key]) {
        el.style.height = sizes[key] + 'px';
      }
    });
  }

  function setupResizeObservers() {
    if (typeof ResizeObserver === 'undefined') return;
    var timers = {};
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        var key = el.getAttribute('data-resize-id') || el.id;
        if (!key || el.offsetParent === null) return;
        var height = Math.round(el.getBoundingClientRect().height);
        clearTimeout(timers[key]);
        timers[key] = setTimeout(function () { saveSize(key, height); }, 400);
      });
    });
    document.querySelectorAll('.dyg-resizable').forEach(function (el) { ro.observe(el); });
  }

  function setupDragReorder(main) {
    var dragging = null;

    main.querySelectorAll('.dyg-drag-handle').forEach(function (handle) {
      handle.addEventListener('dragstart', function (e) {
        dragging = handle.closest('.dyg-block');
        if (!dragging) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragging.getAttribute('data-block-id') || '');
        dragging.classList.add('dyg-dragging');
      });
      handle.addEventListener('dragend', function () {
        if (dragging) dragging.classList.remove('dyg-dragging');
        main.querySelectorAll('.dyg-drop-target').forEach(function (el) {
          el.classList.remove('dyg-drop-target');
        });
        dragging = null;
      });
    });

    main.addEventListener('dragover', function (e) {
      if (!dragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var target = e.target.closest('.dyg-block');
      main.querySelectorAll('.dyg-drop-target').forEach(function (el) {
        if (el !== target) el.classList.remove('dyg-drop-target');
      });
      if (!target || target === dragging) return;
      target.classList.add('dyg-drop-target');
    });

    main.addEventListener('drop', function (e) {
      if (!dragging) return;
      e.preventDefault();
      var target = e.target.closest('.dyg-block');
      main.querySelectorAll('.dyg-drop-target').forEach(function (el) {
        el.classList.remove('dyg-drop-target');
      });
      if (!target || target === dragging) return;

      var rect = target.getBoundingClientRect();
      var insertBefore = (e.clientY - rect.top) < (rect.height / 2);
      main.insertBefore(dragging, insertBefore ? target : target.nextSibling);

      var order = [];
      main.querySelectorAll(':scope > .dyg-block').forEach(function (el) {
        order.push(el.getAttribute('data-block-id'));
      });
      saveOrder(order);
    });
  }

  window.resetPanelLayout = function () {
    try {
      localStorage.removeItem(ORDER_KEY);
      localStorage.removeItem(SIZES_KEY);
    } catch (e) {}
    location.reload();
  };

  var main = document.getElementById('main-scroll');
  if (!main) return;
  applySavedOrder(main);
  applySavedSizes();
  setupDragReorder(main);
  setupResizeObservers();
})();
