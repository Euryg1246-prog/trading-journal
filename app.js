
/* ============================================================
   AUTO-RECÁLCULO DE P/L
   Detecta trades con PL=0 que tienen entry+exit y los corrige
   ============================================================ */
async function autoRecalcPL() {
  if (!currentUser || !trades.length) return;

  const toFix = trades.filter(t => 
    (t.pl === 0 || t.pl === null || t.pl === undefined) &&
    t.entry > 0 && t.exit > 0 && t.symbol
  );

  if (!toFix.length) return;

  console.log(`Auto-recalculando P/L para ${toFix.length} trades...`);

  const updates = toFix.map(async t => {
    const pv     = getPointValue(t.symbol);
    const points = t.direction === 'Short' ? t.entry - t.exit : t.exit - t.entry;
    const pl     = points * pv * (t.contracts || 1);

    // Update local
    t.points = points;
    t.pl     = pl;

    // Update in Supabase
    if (t._id) {
      await _supabase
        .from('trades')
        .update({ pl, points })
        .eq('id', t._id)
        .eq('user_id', currentUser.id);
    }
  });

  await Promise.all(updates);

  if (toFix.length > 0) {
    showToast(`✅ ${toFix.length} trade${toFix.length > 1 ? 's' : ''} recalculado${toFix.length > 1 ? 's' : ''}`, 
      'El sistema detectó y corrigió trades con P/L pendiente.');
    render();
  }
}


/* ============================================================
   DETECCIÓN AUTOMÁTICA DE SÍMBOLO POR PRECIO
   ============================================================ */
// Pairs: [micro, full, label]
const SYMBOL_PAIRS = [
  ['MNQ', 'NQ',  'Nasdaq',  25000, 40000],
  ['MYM', 'YM',  'Dow',     40000, 60000],
  ['MES', 'ES',  'S&P 500', 5000,  7000 ],
  ['MGC', 'GC',  'Gold',    250,   3500 ],
  ['MCL', 'CL',  'Crude',   60,    100  ],
];

function autoDetectSymbol() {
  const entryEl = document.getElementById("entry");
  const symbolEl = document.getElementById("symbol");
  if (!entryEl || !symbolEl) return;

  const price = parseFloat(entryEl.value);
  if (!price) return;

  // Only auto-detect if symbol is not already selected
  if (symbolEl.value && symbolEl.value !== '') return;

  // Remove any existing picker
  const existingPicker = document.getElementById("symbolPicker");
  if (existingPicker) existingPicker.remove();

  // Find matching pair by price range
  const pair = SYMBOL_PAIRS.find(p => price >= p[3] && price <= p[4]);

  // All available symbols with their point values
  const allSymbols = [
    { sym: 'MNQ', pv: 2,    label: 'Micro Nasdaq'  },
    { sym: 'NQ',  pv: 20,   label: 'Nasdaq Full'   },
    { sym: 'MYM', pv: 0.5,  label: 'Micro Dow'     },
    { sym: 'YM',  pv: 5,    label: 'Dow Full'      },
    { sym: 'MES', pv: 5,    label: 'Micro S&P'     },
    { sym: 'ES',  pv: 50,   label: 'S&P Full'      },
    { sym: 'MGC', pv: 10,   label: 'Micro Gold'    },
    { sym: 'GC',  pv: 100,  label: 'Gold Full'     },
    { sym: 'MCL', pv: 100,  label: 'Micro Crude'   },
    { sym: 'CL',  pv: 1000, label: 'Crude Full'    },
  ];

  // Add custom symbols
  try {
    const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
    Object.entries(customs).forEach(([sym, pv]) => {
      allSymbols.push({ sym, pv, label: 'Custom' });
    });
  } catch(e) {}

  // If price matches a pair, show those two first + rest collapsible
  // If no match, show all
  const suggested = pair ? [pair[0], pair[1]] : [];
  const others    = allSymbols.filter(s => !suggested.includes(s.sym));

  const picker = document.createElement('div');
  picker.id = 'symbolPicker';
  picker.style.cssText = 'margin-top:10px;';

  const colors = ['#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6','#fbbf24','#94a3b8'];

  let btns = '';

  // Suggested first (highlighted)
  if (suggested.length) {
    btns += `<div style="font-size:11px;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Sugeridos por precio:</div>`;
    btns += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">`;
    suggested.forEach((sym, i) => {
      const info = allSymbols.find(s => s.sym === sym);
      if (!info) return;
      btns += `<button type="button" onclick="pickSymbol('${sym}')" style="
        background:rgba(56,189,248,0.2);border:2px solid #38bdf8;color:#38bdf8;
        padding:7px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;
        font-family:DM Sans,sans-serif;display:flex;flex-direction:column;align-items:center;gap:2px">
        ${sym}<span style="font-size:10px;opacity:.7">$${info.pv}/pt</span>
      </button>`;
    });
    btns += `</div>`;
  }

  btns += `<div style="font-size:11px;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">${suggested.length ? 'Otros instrumentos:' : 'Selecciona el instrumento:'}</div>`;
  btns += `<div style="display:flex;gap:8px;flex-wrap:wrap">`;
  others.forEach((info, i) => {
    const c = colors[i % colors.length];
    btns += `<button type="button" onclick="pickSymbol('${info.sym}')" style="
      background:${c}18;border:1.5px solid ${c};color:${c};
      padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
      font-family:DM Sans,sans-serif;display:flex;flex-direction:column;align-items:center;gap:2px">
      ${info.sym}<span style="font-size:10px;opacity:.7">$${info.pv}/pt</span>
    </button>`;
  });
  btns += `</div>`;

  picker.innerHTML = btns;
  entryEl.closest('label').appendChild(picker);
}

function pickSymbol(sym) {
  const symbolEl = document.getElementById("symbol");
  if (symbolEl && symbolEl.querySelector(`option[value="${sym}"]`)) {
    symbolEl.value = sym;
  }
  // Remove picker
  const picker = document.getElementById("symbolPicker");
  if (picker) picker.remove();
  showToast('✅ Símbolo seleccionado', sym);
}


/* ============================================================
   PANEL COLLAPSE — Solo ocultar/mostrar contenido
   ============================================================ */
function initPanelCollapse() {
  document.querySelectorAll('.panel').forEach((panel, idx) => {
    if (panel.dataset.collapseInit) return;
    panel.dataset.collapseInit = "1";

    const h2 = panel.querySelector('h2');
    if (!h2) return;

    // Create toggle button
    const btn = document.createElement('button');
    btn.innerHTML = '−';
    btn.title = 'Ocultar / mostrar';
    btn.style.cssText = 'background:none;border:1px solid rgba(96,165,250,0.3);color:var(--text2);border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:13px;line-height:1;margin-left:auto;flex-shrink:0;font-family:monospace;';
    btn.onclick = (e) => {
      e.stopPropagation();
      const pid = panel.dataset.panelId;
      const isHidden = panel.dataset.collapsed === '1';
      // Toggle all children except h2
      Array.from(panel.children).forEach(child => {
        if (child !== h2) child.style.display = isHidden ? '' : 'none';
      });
      panel.dataset.collapsed = isHidden ? '0' : '1';
      btn.innerHTML = isHidden ? '−' : '+';
      // Save state
      try {
        const states = JSON.parse(localStorage.getItem('dygpro_collapsed') || '{}');
        states[pid] = !isHidden;
        localStorage.setItem('dygpro_collapsed', JSON.stringify(states));
      } catch(e) {}
    };

    // Make h2 flex
    h2.style.cssText += ';display:flex;align-items:center;';
    h2.appendChild(btn);

    // Assign stable panel ID (igual entre sesiones para que ocultar/mostrar persista)
    const pid = panel.id ? ('panel_' + panel.id) : ('panel_idx_' + idx);
    panel.dataset.panelId = pid;

    // Restore saved state
    try {
      const states = JSON.parse(localStorage.getItem('dygpro_collapsed') || '{}');
      if (states[pid]) {
        Array.from(panel.children).forEach(child => {
          if (child !== h2) child.style.display = 'none';
        });
        panel.dataset.collapsed = '1';
        btn.innerHTML = '+';
      }
    } catch(e) {}
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initPanelCollapse, 600);
});


/* ============================================================
   FILTRO POR PLATAFORMA EN EQUITY CURVE
   ============================================================ */
let activeSourceFilters = new Set(); // se llena dinámicamente con los sources reales

function buildSourceFilters() {
  // Get all unique sources from current trades
  const sources = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];

  // Restore saved filters or activate all
  try {
    const saved = localStorage.getItem("dygpro_source_filters");
    if (saved) {
      const savedFilters = JSON.parse(saved);
      activeSourceFilters = new Set(savedFilters);
    } else {
      sources.forEach(s => activeSourceFilters.add(s));
    }
  } catch(e) {
    sources.forEach(s => activeSourceFilters.add(s));
  }

  // Build filter buttons dynamically
  const row = document.getElementById("sourceFilterRow");
  if (!row) return;

  const SOURCE_COLORS = {
    tradingview: { color: '#34d399', bg: 'rgba(52,211,153,0.2)',  label: 'TradingView' },
    webull:      { color: '#fb923c', bg: 'rgba(251,146,60,0.2)',  label: 'Webull'      },
    tradovate:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.2)', label: 'Tradovate'   },
    manual:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.2)',  label: 'Manual'      },
    universal:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.2)', label: 'CSV Import'  },
    ninjatrader: { color: '#f472b6', bg: 'rgba(244,114,182,0.2)', label: 'NinjaTrader' },
  };

  // Clear existing dynamic buttons (keep "Todas")
  row.querySelectorAll('.source-toggle:not([data-source="all"])').forEach(b => b.remove());

  // Add a button for each source found
  sources.forEach(src => {
    const cfg = SOURCE_COLORS[src] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.2)', label: src.charAt(0).toUpperCase() + src.slice(1) };
    const btn = document.createElement('button');
    btn.className = 'source-toggle';
    btn.setAttribute('data-source', src);
    btn.onclick = () => toggleSourceFilter(src);
    btn.style.cssText = `background:${cfg.bg};border:2px solid ${cfg.color};color:${cfg.color};padding:8px 16px;font-size:12px`;
    btn.textContent = '● ' + cfg.label;
    row.appendChild(btn);
  });
}

function toggleSourceFilter(source) {
  const ALL_SOURCES = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];

  if (source === 'all') {
    const allActive = ALL_SOURCES.every(s => activeSourceFilters.has(s));
    if (allActive) {
      activeSourceFilters.clear();
    } else {
      activeSourceFilters = new Set(ALL_SOURCES);
    }
  } else {
    if (activeSourceFilters.has(source)) {
      activeSourceFilters.delete(source);
    } else {
      activeSourceFilters.add(source);
    }
  }

  // Save active filters to localStorage
  try { localStorage.setItem("dygpro_source_filters", JSON.stringify([...activeSourceFilters])); } catch(e) {}

  // Update button visual state
  document.querySelectorAll('.source-toggle').forEach(btn => {
    const s = btn.getAttribute('data-source');
    if (s === 'all') {
      const ALL_SOURCES_CHECK = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];
      const allActive = ALL_SOURCES_CHECK.every(x => activeSourceFilters.has(x));
      btn.style.opacity = allActive ? '1' : '0.4';
      btn.style.textDecoration = allActive ? 'none' : 'line-through';
    } else {
      const isActive = activeSourceFilters.has(s);
      btn.style.opacity = isActive ? '1' : '0.35';
      btn.style.textDecoration = isActive ? 'none' : 'line-through';
    }
  });

  renderChart();
  render();
}

function getSourceFilteredTrades(list) {
  if (activeSourceFilters.size === 0) return [];
  return list.filter(t => {
    const src = (t.source || 'manual').toLowerCase();
    return activeSourceFilters.has(src);
  });
}


/* ============================================================
   ORIGEN DEL TRADE — Badge por plataforma
   ============================================================ */
const SOURCE_CONFIG = {
  "manual":      { label: "Manual",      color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  "webull":      { label: "Webull",      color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  "tradovate":   { label: "Tradovate",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "tradingview": { label: "TradingView", color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  "ninjatrader": { label: "NinjaTrader", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  "universal":   { label: "CSV Import",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

function getSourceBadge(source) {
  const key = (source || "manual").toLowerCase()
    .replace(" import","").replace(" strategy","").replace("tester","")
    .replace("tradingview strategy tester","tradingview")
    .trim();
  const cfg = SOURCE_CONFIG[key] || SOURCE_CONFIG["universal"];
  return `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:999px;
    font-size:10px;
    font-weight:700;
    letter-spacing:.4px;
    text-transform:uppercase;
    color:${cfg.color};
    background:${cfg.bg};
    border:1px solid ${cfg.color}40;
    font-family:DM Sans,sans-serif;
    white-space:nowrap;
  ">${cfg.label}</span>`;
}


/* ── Zoom en imagen del modal ── */
let _imgZoomLevel = 1;

function zoomModalImg(e) {
  e.preventDefault();
  const img = document.getElementById("modalImg");
  if (!img) return;
  _imgZoomLevel += e.deltaY < 0 ? 0.15 : -0.15;
  _imgZoomLevel = Math.min(Math.max(_imgZoomLevel, 1), 4);
  img.style.transform = `scale(${_imgZoomLevel})`;
  img.style.cursor = _imgZoomLevel > 1 ? "zoom-out" : "zoom-in";
}

function toggleImgZoom(img) {
  if (_imgZoomLevel > 1) {
    _imgZoomLevel = 1;
    img.style.transform = "scale(1)";
    img.style.cursor = "zoom-in";
  } else {
    _imgZoomLevel = 2;
    img.style.transform = "scale(2)";
    img.style.cursor = "zoom-out";
  }
}


/* ============================================================
   TIPO DE INSTRUMENTO
   ============================================================ */
function handleInstrumentType(type) {
  const futuresFields = document.getElementById("futuresFields");
  const optionsFields = document.getElementById("optionsFields");

  if (type === "futures") {
    if (futuresFields) futuresFields.style.display = "contents";
    if (optionsFields) optionsFields.style.display = "none";
    // Make futures fields required
    document.getElementById("entry")?.removeAttribute("required");
    document.getElementById("exit")?.removeAttribute("required");
  } else {
    if (futuresFields) futuresFields.style.display = "none";
    if (optionsFields) optionsFields.style.display = "block";
  }
}

function getInstrumentPL() {
  const type = document.getElementById("instrumentType")?.value || "futures";

  if (type === "futures") return null; // calculated from points

  const entry     = parseFloat(document.getElementById("optionEntry")?.value || 0);
  const exit      = parseFloat(document.getElementById("optionExit")?.value || 0);
  const contracts = parseFloat(document.getElementById("optionContracts")?.value || 1);
  const directPL  = parseFloat(document.getElementById("directPL")?.value || 0);
  const optType   = document.getElementById("optionType")?.value || "call";

  // If direct P/L provided, use it
  if (directPL !== 0) return directPL;

  // Calculate from entry/exit
  if (entry && exit) {
    const multiplier = optType === "stock" ? 1 : 100; // options = 100 shares per contract
    return (exit - entry) * contracts * multiplier;
  }

  return 0;
}

function getInstrumentEntry() {
  const type = document.getElementById("instrumentType")?.value || "futures";
  if (type === "futures") return parseFloat(document.getElementById("entry")?.value || 0);
  return parseFloat(document.getElementById("optionEntry")?.value || 0);
}

function getInstrumentExit() {
  const type = document.getElementById("instrumentType")?.value || "futures";
  if (type === "futures") return parseFloat(document.getElementById("exit")?.value || 0);
  return parseFloat(document.getElementById("optionExit")?.value || 0);
}

function getInstrumentContracts() {
  const type = document.getElementById("instrumentType")?.value || "futures";
  if (type === "futures") return parseInt(document.getElementById("contracts")?.value || 1);
  return parseInt(document.getElementById("optionContracts")?.value || 1);
}



function toggleMarketsPanel() {
  const panel = document.getElementById("marketsPanelContent");
  const arrow = document.getElementById("marketsPanelArrow");
  if (!panel) return;
  const isOpen = panel.style.display !== "none";
  panel.style.display = isOpen ? "none" : "block";
  if (arrow) arrow.textContent = isOpen ? "▼" : "▲";
  if (!isOpen) renderCustomMarkets();
}


/* ============================================================
   MERCADOS PERSONALIZADOS
   ============================================================ */
function addCustomMarket() {
  const name = document.getElementById("newSymbolName")?.value.trim().toUpperCase();
  const pv   = parseFloat(document.getElementById("newSymbolPoint")?.value || "0");

  if (!name) { showToast("⚠️ Error", "Escribe el nombre del símbolo."); return; }
  if (!pv || pv <= 0) { showToast("⚠️ Error", "El valor por punto debe ser mayor a 0."); return; }

  const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
  customs[name] = pv;
  localStorage.setItem("dygpro_custom_symbols", JSON.stringify(customs));

  // Add to all selectors
  addSymbolToSelectors(name, pv);

  // Clear inputs
  if (document.getElementById("newSymbolName")) document.getElementById("newSymbolName").value = "";
  if (document.getElementById("newSymbolPoint")) document.getElementById("newSymbolPoint").value = "";

  renderCustomMarkets();
  showToast("✅ Mercado agregado", `${name} añadido con valor $${pv} por punto.`);
}

function removeCustomMarket(name) {
  const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
  delete customs[name];
  localStorage.setItem("dygpro_custom_symbols", JSON.stringify(customs));

  // Remove from both selectors
  const sel = document.getElementById("symbol");
  sel?.querySelector(`option[value="${name}"]`)?.remove();
  const quick = document.getElementById("quickMarket");
  quick?.querySelector(`option[value="${name}|Long"]`)?.remove();
  quick?.querySelector(`option[value="${name}|Short"]`)?.remove();

  renderCustomMarkets();
}

function renderCustomMarkets() {
  const list = document.getElementById("customMarketsList");
  if (!list) return;

  const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
  const keys = Object.keys(customs);

  if (!keys.length) {
    list.innerHTML = '<p style="font-size:13px;color:var(--text2)">No hay mercados personalizados aún.</p>';
    return;
  }

  list.innerHTML = keys.map(name => `
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
      <span style="font-size:14px;color:var(--text);font-family:DM Mono,monospace">${name}</span>
      <span style="font-size:13px;color:var(--text2)">$${customs[name]} por punto</span>
      <button onclick="removeCustomMarket('${name}')" class="danger-btn" style="padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid rgba(244,63,94,0.3);background:rgba(244,63,94,0.1);color:var(--red);font-family:DM Sans,sans-serif">Eliminar</button>
    </div>
  `).join("");
}

// Load custom markets into symbol selector on startup
function addSymbolToSelectors(name, pv) {
  // Add to all selectors
  addSymbolToSelectors(name, pv);

  // Add to quickMarket selector (Long + Short)
  const quick = document.getElementById("quickMarket");
  if (quick) {
    if (!quick.querySelector(`option[value="${name}|Long"]`)) {
      const optL = document.createElement("option");
      optL.value = `${name}|Long`;
      optL.textContent = `${name} Long`;
      quick.insertBefore(optL, quick.querySelector('option[value="custom|Long"]'));
    }
    if (!quick.querySelector(`option[value="${name}|Short"]`)) {
      const optS = document.createElement("option");
      optS.value = `${name}|Short`;
      optS.textContent = `${name} Short`;
      quick.insertBefore(optS, quick.querySelector('option[value="custom|Short"]'));
    }
  }
}

function loadCustomMarketsIntoSelector() {
  const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
  Object.entries(customs).forEach(([name, pv]) => {
    addSymbolToSelectors(name, pv);
  });
  renderCustomMarkets();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCustomMarketsIntoSelector();
});


/* ============================================================
   SÍMBOLO PERSONALIZADO
   ============================================================ */
function handleSymbolChange(sel) {
  const box = document.getElementById("customSymbolBox");
  if (!box) return;
  if (sel.value === "custom") {
    box.style.display = "block";
  } else {
    box.style.display = "none";
  }
}

function getSelectedSymbol() {
  const sel = document.getElementById("symbol");
  if (!sel) return "";
  if (sel.value === "custom") {
    const name = document.getElementById("customSymbolName")?.value.trim().toUpperCase();
    const pv   = parseFloat(document.getElementById("customSymbolPoint")?.value || "1");
    if (name) {
      // Save custom symbol for future use
      const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
      customs[name] = pv;
      localStorage.setItem("dygpro_custom_symbols", JSON.stringify(customs));
      // Add to selector for next time
      if (!sel.querySelector(`option[value="${name}"]`)) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${name} ($${pv}/pt)`;
        sel.insertBefore(opt, sel.querySelector('option[value="custom"]'));
      }
    }
    return name || "CUSTOM";
  }
  return sel.value;
}


/* ============================================================
   CONFIG UI — Guardar y mostrar configuración del sistema
   ============================================================ */
const DAY_NAMES_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const DAY_NAMES_SHORT = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];

function restoreEquityFilter() {
  const start = localStorage.getItem("dygpro_filter_start");
  const end   = localStorage.getItem("dygpro_filter_end");
  if (start) {
    const el = document.getElementById("equityStartDate");
    if (el) el.value = start;
  }
  if (end) {
    const el = document.getElementById("equityEndDate");
    if (el) el.value = end;
  }
}

function initSystemConfigUI() {
  const cfg = systemConfig;

  const nameEl = document.getElementById("cfgSystemName");
  if (nameEl) nameEl.value = cfg.systemName || "Mi Sistema";

  const startDayEl = document.getElementById("cfgStartDay");
  if (startDayEl) startDayEl.value = cfg.startDay;

  const endDayEl = document.getElementById("cfgEndDay");
  if (endDayEl) endDayEl.value = cfg.endDay;

  const startHourEl = document.getElementById("cfgStartHour");
  if (startHourEl) startHourEl.value = `${String(cfg.startHour).padStart(2,"0")}:00`;

  const endHourEl = document.getElementById("cfgEndHour");
  if (endHourEl) endHourEl.value = `${String(cfg.endHour).padStart(2,"0")}:00`;

  const checkboxes = document.querySelectorAll("#cfgDayCheckboxes input[type=checkbox]");
  checkboxes.forEach(cb => {
    cb.checked = cfg.allDayDays.includes(Number(cb.value));
  });

  updateSystemDisplay();
}

function saveSystemConfigUI() {
  const name     = document.getElementById("cfgSystemName")?.value || "Mi Sistema";
  const startDay = Number(document.getElementById("cfgStartDay")?.value ?? 0);
  const endDay   = Number(document.getElementById("cfgEndDay")?.value ?? 3);
  const startTime = document.getElementById("cfgStartHour")?.value || "18:00";
  const endTime   = document.getElementById("cfgEndHour")?.value || "16:00";
  const startHour = Number(startTime.split(":")[0]);
  const endHour   = Number(endTime.split(":")[0]);

  const allDayDays = [];
  document.querySelectorAll("#cfgDayCheckboxes input[type=checkbox]:checked").forEach(cb => {
    allDayDays.push(Number(cb.value));
  });

  const tradingDays = [...new Set([startDay, ...allDayDays, endDay])];

  systemConfig = { systemName: name, tradingDays, startDay, startHour, endDay, endHour, allDayDays };
  saveSystemConfig(systemConfig);
  updateSystemDisplay();

  const preview = document.getElementById("cfgPreview");
  if (preview) {
    preview.style.display = "block";
    preview.innerHTML = `✅ <strong>Configuración guardada.</strong> Tu ventana: ${DAY_NAMES_SHORT[startDay]} ${startHour}:00 → ${DAY_NAMES_SHORT[endDay]} ${endHour}:00`;
  }

  showToast("✅ Sistema configurado", `Ventana: ${DAY_NAMES_SHORT[startDay]} ${startHour}:00 → ${DAY_NAMES_SHORT[endDay]} ${endHour}:00`);
}

function resetSystemConfig() {
  systemConfig = { ...DEFAULT_CONFIG };
  saveSystemConfig(systemConfig);
  initSystemConfigUI();
  showToast("↩️ Configuración restablecida", "Se usarán los valores por defecto.");
}

function updateSystemDisplay() {
  const cfg = systemConfig;
  const windowEl = document.getElementById("systemWindowDisplay");
  const daysEl   = document.getElementById("systemDaysDisplay");

  // Check if user has configured their system
  const hasConfig = localStorage.getItem("dygpro_system_config");

  if (windowEl) {
    if (!hasConfig) {
      windowEl.textContent = "Sin configurar — ve a Mi Sistema";
    } else {
      const sh = String(cfg.startHour).padStart(2,'0');
      const eh = String(cfg.endHour).padStart(2,'0');
      windowEl.textContent = DAY_NAMES_SHORT[cfg.startDay] + ' ' + sh + ':00 → ' + DAY_NAMES_SHORT[cfg.endDay] + ' ' + eh + ':00';
    }
  }

  if (daysEl) {
    if (!hasConfig) {
      daysEl.textContent = "Sin configurar";
    } else if (cfg.allDayDays.length === 7) {
      daysEl.textContent = "Toda la semana";
    } else if (cfg.allDayDays.length === 0) {
      daysEl.textContent = "Solo ventana definida";
    } else {
      daysEl.textContent = cfg.allDayDays.map(d => DAY_NAMES_SHORT[d]).join(" · ");
    }
  }
}

// Init on load
document.addEventListener("DOMContentLoaded", () => {
  initSystemConfigUI();
  restoreEquityFilter();
});


/* ============================================================
   CONFIGURACIÓN DEL SISTEMA — Cada trader define sus reglas
   ============================================================ */

const DEFAULT_CONFIG = {
  systemName:   "Mi Sistema",
  tradingDays:  [1, 2, 3, 4, 5],  // Lun-Vie por defecto
  startDay:     1,                 // Lunes
  startHour:    9,                 // 9:00 AM
  endDay:       5,                 // Viernes
  endHour:      16,                // 4:00 PM
  allDayDays:   [1, 2, 3, 4, 5], // Lun-Vie todo el día
};

function loadSystemConfig() {
  try {
    const saved = localStorage.getItem("dygpro_system_config");
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
  } catch(e) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveSystemConfig(cfg) {
  if (viewingStudent) return;
  localStorage.setItem("dygpro_system_config", JSON.stringify(cfg));
  // Sincronizar en Supabase si hay sesión activa
  if (currentUser) {
    _supabase.from('profiles').upsert({
      id: currentUser.id,
      system_config: JSON.stringify(cfg)
    }, { onConflict: 'id' }).then(({ error }) => {
      if (error) console.log('Error guardando config en Supabase:', error.message);
    });
  }
}

let systemConfig = loadSystemConfig();


/* ============================================================
   STRIPE — Suscripciones
   ============================================================ */
const STRIPE_PK       = "pk_live_51Ni9tREkiXgRr3dMRaXKZxdFgX2NfaS6xLpgglnPZMLi6MCQmNbRDa44X1XDQ1U9uS58rS0rIvxCXHV2nJbPKQNd00vjdaWBij";
const STRIPE_PRICE_ID = "price_1TfRzHEkiXgRr3dMjiQgdhuF";
const FREE_TRADE_LIMIT = 30;

let userPlan = 'free'; // 'free' o 'pro'

async function checkUserPlan() {
  if (!currentUser) return;

  // Check plan in Supabase profiles table
  const { data } = await _supabase
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', currentUser.id)
    .single();

  userPlan = data?.plan || 'free';
  updatePlanUI();
}

function updatePlanUI() {
  const banner = document.getElementById('upgrade-banner');
  const badge  = document.getElementById('plan-badge');

  if (userPlan === 'pro') {
    if (banner) banner.style.display = 'none';
    if (badge) {
      badge.textContent = 'PRO';
      badge.style.display = 'inline';
      badge.style.background = 'var(--accent)';
      badge.style.color = '#000';
    }
  } else {
    if (banner) banner.style.display = 'flex';
    if (badge) {
      badge.textContent = 'FREE';
      badge.style.display = 'inline';
      badge.style.background = 'rgba(255,255,255,0.1)';
      badge.style.color = 'var(--text2)';
    }
  }
}

function isPro() {
  return userPlan === 'pro';
}

function checkTradeLimit() {
  if (isPro()) return true;
  if (trades.length >= FREE_TRADE_LIMIT) {
    showToast('⚡ Límite del plan Free',
      `Has alcanzado ${FREE_TRADE_LIMIT} trades. Actualiza a Pro para continuar registrando operaciones.`
    );
    return false;
  }
  return true;
}

function canAddTrade() {
  return isPro() || trades.length < FREE_TRADE_LIMIT;
}

async function startCheckout() {
  if (!currentUser) { showToast('⚠️ Sesión requerida', 'Debes iniciar sesión primero.'); return; }

  showToast('⏳ Preparando checkout...', 'Conectando con Stripe...');

  try {
    // Create checkout session via Supabase Edge Function
    const { data, error } = await _supabase.functions.invoke('create-checkout', {
      body: {
        priceId:    STRIPE_PRICE_ID,
        userId:     currentUser.id,
        userEmail:  currentUser.email,
        successUrl: window.location.origin + '?upgraded=true',
        cancelUrl:  window.location.href,
      }
    });

    if (error || !data?.url) {
      showToast('⚠️ Error', 'No se pudo iniciar el checkout. Intenta de nuevo.');
      console.error(error);
      return;
    }

    window.location.href = data.url;
  } catch(e) {
    showToast('⚠️ Error', 'Problema de conexión. Intenta de nuevo.');
    console.error(e);
  }
}

// Check if returning from successful payment
(function checkUpgradeReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('upgraded') === 'true') {
    showToast('🎉 ¡Bienvenido a Pro!', 'Tu cuenta ha sido actualizada. Disfruta todas las funciones.');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    // Refresh plan after short delay
    setTimeout(() => checkUserPlan(), 2000);
  }
})();


/* ============================================================
   SONIDO DE CAMPANA — Web Audio API
   ============================================================ */
let bellAudioCtx = null;

function getBellAudioContext() {
  if (!bellAudioCtx) {
    bellAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (bellAudioCtx.state === 'suspended') {
    bellAudioCtx.resume();
  }
  return bellAudioCtx;
}

// Desbloquea el audio en la primera interacción del usuario (los navegadores
// bloquean el sonido automático hasta que hay un click/tecla del usuario)
['click', 'keydown', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => getBellAudioContext(), { once: true });
});

function playBell() {
  try {
    const ctx = getBellAudioContext();

    // Campana: frecuencia fundamental + armónicos
    const frequencies = [523, 659, 784, 1047];
    const gains       = [0.6, 0.4, 0.3, 0.2];

    frequencies.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Fade in rápido, fade out suave (efecto campana)
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gains[i], ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    });
  } catch(e) {
    console.log('Audio no disponible:', e);
  }
}


/* ============================================================
   SIDEBAR COLLAPSE / EXPAND
   ============================================================ */
function collapseSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const mainScroll = document.getElementById('main-scroll');
  const showBtn    = document.getElementById('btn-show-sidebar');

  if (sidebar) sidebar.style.display = 'none';
  if (mainScroll) {
    mainScroll.style.marginLeft = '0';
    mainScroll.style.width = '100%';
  }
  if (showBtn) showBtn.style.display = 'flex';
}

function expandSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const mainScroll = document.getElementById('main-scroll');
  const showBtn    = document.getElementById('btn-show-sidebar');

  if (sidebar) sidebar.style.display = 'flex';
  if (mainScroll) {
    mainScroll.style.marginLeft = '220px';
    mainScroll.style.width = 'calc(100vw - 220px)';
  }
  if (showBtn) showBtn.style.display = 'none';
}


/* ============================================================
   VISTA COMPLETA vs VISTA POR SECCIONES
   ============================================================ */
let currentView = localStorage.getItem('dygpro_view') || 'scroll';

// All section IDs for sidebar mode
const ALL_SECTIONS = [
  'section-dashboard','section-calendar','section-notes','section-research',
  'section-scorecard-wrapper','section-drift','section-recovery','section-setup','section-montecarlo','section-account',
  'section-config','section-data','section-entry','section-history','section-sessions',
  'section-profile','section-gallery',
  'section-admin-students'
];

let activeSidebarSection = localStorage.getItem('dygpro_active_section') || 'section-dashboard';

function setView(mode) {
  currentView = mode;
  localStorage.setItem('dygpro_view', mode);

  const sidebar    = document.getElementById('sidebar');
  const btnScroll  = document.getElementById('btn-scroll');
  const btnSidebar = document.getElementById('btn-sidebar');
  const mainScroll = document.getElementById('main-scroll');

  if (mode === 'sidebar') {
    // Mostrar sidebar
    if (sidebar) { sidebar.style.display = 'flex'; sidebar.classList.remove('hidden'); }
    // Empujar contenido a la derecha del sidebar — usar padding no margin
    if (mainScroll) {
      mainScroll.style.marginLeft = '220px';
      mainScroll.style.width = 'calc(100vw - 220px)';
      mainScroll.style.minWidth = '0';
      mainScroll.style.overflowX = 'hidden';
    }
    btnScroll?.classList.remove('active');
    btnSidebar?.classList.add('active');
    // Ocultar todo, mostrar solo sección activa
    ALL_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    showSidebarSection(activeSidebarSection);
  } else {
    // Ocultar sidebar
    if (sidebar) { sidebar.style.display = 'none'; sidebar.classList.add('hidden'); }
    // Contenido a ancho completo
    if (mainScroll) {
      mainScroll.style.marginLeft = '0';
      mainScroll.style.width = '100%';
      mainScroll.style.overflowX = '';
    }
    btnScroll?.classList.add('active');
    btnSidebar?.classList.remove('active');
    // Mostrar todas las secciones
    ALL_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
  }
}

function showSidebarSection(sectionId) {
  activeSidebarSection = sectionId;
  localStorage.setItem('dygpro_active_section', sectionId);

  // Si estás en vista completa (scroll), solo hacer scroll a la sección
  if (currentView !== 'sidebar') {
    const target = document.getElementById(sectionId);
    if (target) {
      // Asegurarse que la sección esté visible
      target.style.display = '';
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
    return;
  }

  // Vista sidebar — ocultar todo y mostrar solo la sección pedida
  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(sectionId);
  if (target) target.style.display = '';
  // Marcar nav activo
  document.querySelectorAll('#sidebar .nav-item').forEach(item => {
    const oc = item.getAttribute('onclick') || '';
    item.classList.toggle('active', oc.includes("'" + sectionId + "'"));
  });
  window.scrollTo(0, 0);
  // En mobile cerrar el sidebar automáticamente
  if (window.innerWidth <= 768) {
    collapseSidebar();
  }
}

// Restore saved view on load
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('dygpro_view') || 'scroll';
  setView(saved);
});


/* ============================================================
   NAVEGACIÓN — Sidebar páginas
   ============================================================ */
function showPage(pageId) {
  // Ocultar todas las secciones
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  // Mostrar la sección seleccionada
  const section = document.getElementById('page-' + pageId);
  if (section) section.classList.add('active');
  // Actualizar nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('onclick')?.includes("'" + pageId + "'"));
  });
}

/* ============================================================
   SUPABASE CONFIG
   Reemplaza estos valores con los de tu proyecto en:
   supabase.com → Project Settings → API
   ============================================================ */
const SUPABASE_URL = "https://mcqrhjahbbcfyqujirmd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcXJoamFoYmJjZnlxdWppcm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDY5NzcsImV4cCI6MjA5NjMyMjk3N30.JCBC1HOFU-6LvBhw9ipoYKI4zzdKOU-t-iu4rNwzkCE";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage }
});

/* ============================================================
   AUTH — Estado global y UI
   ============================================================ */
let currentUser = null;

/* ============================================================
   ADMIN — "Mis Estudiantes" (acceso de solo lectura)
   ============================================================ */
let isAdmin = false;
let viewingStudent = null; // { id, email } cuando el admin está viendo a un estudiante

function activeUserId() {
  return viewingStudent ? viewingStudent.id : (currentUser ? currentUser.id : null);
}

async function initAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    showApp();
  } else {
    showAuthOverlay();
  }

  _supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      currentUser = session.user;
      // Send welcome email only first time
      const _wKey = 'dygpro_welcome_' + session.user.id;
      if (!localStorage.getItem(_wKey)) {
        localStorage.setItem(_wKey, '1');
        setTimeout(() => {
          _supabase.from('profiles')
            .select('welcome_sent')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (!data?.welcome_sent) {
                _supabase.from('profiles').upsert({ id: session.user.id, welcome_sent: true }, { onConflict: 'id' });
                _supabase.functions.invoke('send-welcome-email', { body: { email: session.user.email } });
              }
            });
        }, 3000);
      }
      showApp();
    }
    if (event === "SIGNED_OUT") {
      currentUser = null;
      trades = [];
      personalNotes = {};
      localStorage.removeItem("dygpro_trades_cache");
      localStorage.removeItem("dygpro_trades_cache");
      showAuthOverlay();
    }
  });
}

function showApp() {
  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("user-email-label").textContent = currentUser.email;
  const initials = currentUser.email.slice(0,2).toUpperCase();
  const av = document.getElementById("user-avatar-initials");
  if (av) av.textContent = initials;
  const saved = localStorage.getItem('dygpro_view') || 'scroll';
  setView(saved);
  loadProfile();
  loadTradesFromSupabase();
  loadNotesFromSupabase();
  loadGalleryFromSupabase();
  checkUserPlan();
  setTimeout(checkOnboarding, 2000);
}

function showAuthOverlay() {
  const overlay = document.getElementById("auth-overlay");
  const bar = document.getElementById("user-bar");
  if (overlay) overlay.classList.remove("hidden");
  if (bar) bar.classList.remove("visible");
}

let authMode = "login";

function showTab(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab button").forEach((btn, i) => {
    btn.classList.toggle("active", (mode === "login" && i === 0) || (mode === "register" && i === 1));
  });
  document.getElementById("auth-submit").textContent = mode === "login" ? "Entrar" : "Crear cuenta";
  document.getElementById("auth-error").textContent = "";
}

async function submitAuth() {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl    = document.getElementById("auth-error");
  errEl.textContent = "";

  if (!email || !password) { errEl.textContent = "Completa email y contraseña."; return; }

  const btn = document.getElementById("auth-submit");
  btn.textContent = "...";
  btn.disabled = true;

  let error, data;
  if (authMode === "login") {
    ({ data, error } = await _supabase.auth.signInWithPassword({ email, password }));
    if (!error && data?.user) {
      currentUser = data.user;
      showApp();
    }
  } else {
    ({ data, error } = await _supabase.auth.signUp({ email, password }));
    if (!error && data?.user) {
      currentUser = data.user;
      showApp();
    } else if (!error) {
      errEl.style.color = "#22c55e";
      errEl.textContent = "Revisa tu email para confirmar la cuenta.";
    }
  }

  btn.disabled = false;
  btn.textContent = authMode === "login" ? "Entrar" : "Crear cuenta";
  if (error) { errEl.style.color = "#ef4444"; errEl.textContent = error.message; }
}

async function resetPassword() {
  const email = document.getElementById("auth-email").value.trim();
  if (!email) { document.getElementById("auth-error").textContent = "Introduce tu email primero."; return; }
  await _supabase.auth.resetPasswordForEmail(email);
  document.getElementById("auth-error").style.color = "#22c55e";
  document.getElementById("auth-error").textContent = "Email de recuperación enviado.";
}

async function signOut() {
  await _supabase.auth.signOut();
  window.location.reload();
}

/* ============================================================
   ADMIN — Panel "Mis Estudiantes"
   ============================================================ */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function applyAdminUI() {
  const navSection = document.getElementById('navSectionAdmin');
  const navItem = document.getElementById('navItemAdminStudents');
  if (navSection) navSection.style.display = isAdmin ? '' : 'none';
  if (navItem) navItem.style.display = isAdmin ? '' : 'none';
  if (isAdmin) loadAdminStudents();
}

async function loadAdminStudents() {
  if (!currentUser || !isAdmin) return;
  const { data, error } = await _supabase
    .from('admin_students')
    .select('*')
    .eq('admin_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.log('Error cargando estudiantes:', error.message); return; }
  renderAdminStudents(data || []);
}

function renderAdminStudents(students) {
  const list = document.getElementById('adminStudentsList');
  if (!list) return;
  if (!students.length) {
    list.innerHTML = `<div class="muted" style="padding:12px 0">Aún no has agregado estudiantes.</div>`;
    return;
  }
  list.innerHTML = students.map(s => {
    const linked = !!s.student_id;
    return `
      <div class="account-status-box" style="justify-content:space-between;margin-bottom:8px;">
        <div>
          <strong>${escapeHtml(s.student_email)}</strong>
          <p>${linked ? '🟢 Registrado' : '🟡 Pendiente de registro'}</p>
        </div>
        ${linked
          ? `<button type="button" class="tool-btn" onclick="viewStudentJournal('${s.student_id}','${s.student_email}')">Ver Journal</button>`
          : `<button type="button" class="tool-btn" disabled style="opacity:.5;cursor:not-allowed">Ver Journal</button>`
        }
      </div>`;
  }).join('');
}

async function addStudent() {
  if (!isAdmin) return;
  const input = document.getElementById('newStudentEmail');
  const email = (input?.value || '').trim();
  if (!email) { showToast('⚠️ Email requerido', 'Escribe el correo del estudiante.'); return; }

  const { error } = await _supabase.rpc('admin_add_student', { p_email: email });
  if (error) { showToast('⚠️ Error', error.message); return; }

  if (input) input.value = '';
  showToast('✅ Estudiante agregado', email);
  loadAdminStudents();
}

async function viewStudentJournal(studentId, email) {
  if (!isAdmin || !studentId || studentId === 'null') {
    showToast('⚠️ Estudiante pendiente', 'Este estudiante aún no se ha registrado en DYGPRO.');
    return;
  }

  viewingStudent = { id: studentId, email };
  document.body.classList.add('admin-viewing');
  const banner = document.getElementById('adminViewBanner');
  const bannerEmail = document.getElementById('adminViewBannerEmail');
  if (bannerEmail) bannerEmail.textContent = email;
  if (banner) banner.style.display = 'flex';

  await Promise.all([
    loadTradesFromSupabase(),
    loadNotesFromSupabase(),
    loadGalleryFromSupabase()
  ]);
  loadProfileForViewing(studentId);
  showSidebarSection('section-dashboard');
}

async function exitStudentView() {
  viewingStudent = null;
  document.body.classList.remove('admin-viewing');
  const banner = document.getElementById('adminViewBanner');
  if (banner) banner.style.display = 'none';

  await Promise.all([
    loadTradesFromSupabase(),
    loadNotesFromSupabase(),
    loadGalleryFromSupabase()
  ]);
  loadProfile();
  showSidebarSection('section-dashboard');
}

/* ============================================================
   SUPABASE — Carga y guardado de trades
   ============================================================ */
async function loadTradesFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from("trades")
    .select("*")
    .eq("user_id", activeUserId())
    .order("date", { ascending: true });

  if (error) { console.error("Error cargando trades:", error); return; }

  trades = (data || []).map(dbRowToTrade);
  try { localStorage.setItem("dygpro_trades_cache", JSON.stringify(trades)); } catch(e) {}
  // Restaurar filtros guardados — si no hay nada guardado, activar todos
  try {
    const saved = localStorage.getItem("dygpro_source_filters");
    if (saved) {
      activeSourceFilters = new Set(JSON.parse(saved));
    } else {
      const allSources = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];
      activeSourceFilters = new Set(allSources);
    }
  } catch(e) {
    const allSources = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];
    activeSourceFilters = new Set(allSources);
  }
  restoreEquityFilter();
  buildSourceFilters();
  render();
  // Auto-fix trades with missing PL
  setTimeout(autoRecalcPL, 500);
}

async function loadNotesFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from("notes")
    .select("*")
    .eq("user_id", activeUserId());

  if (error) { console.error("Error cargando notas:", error); return; }

  personalNotes = {};
  (data || []).forEach(n => { personalNotes[n.note_date] = n.content; });
  renderNotesCalendarProRestore?.();
}

async function saveTradeToSupabase(trade) {
  if (!currentUser || viewingStudent) return null;
  const { error } = await _supabase.from("trades").insert(tradeToDbRow(trade));
  if (error) { console.error("Error guardando trade:", error); return null; }
  return true;
}

async function deleteTradeFromSupabase(tradeId) {
  if (!currentUser || !tradeId || viewingStudent) return;
  await _supabase.from("trades").delete().eq("id", tradeId).eq("user_id", currentUser.id);
}

async function saveNoteToSupabase(date, content) {
  if (!currentUser || viewingStudent) return;
  const { error } = await _supabase.from("notes").upsert(
    { user_id: currentUser.id, note_date: date, content },
    { onConflict: "user_id,note_date" }
  );
  if (error) console.error("Error guardando nota:", error);
}

async function deleteNoteFromSupabase(date) {
  if (!currentUser || viewingStudent) return;
  await _supabase.from("notes").delete()
    .eq("user_id", currentUser.id)
    .eq("note_date", date);
}

/* ============================================================
   MAPPERS — JS ↔ DB (snake_case ↔ camelCase)
   ============================================================ */
function tradeToDbRow(t) {
  return {
    user_id:        currentUser.id,
    date:           t.date,
    time:           t.time,
    day:            t.day,
    symbol:         t.symbol,
    direction:      t.direction,
    entry:          t.entry,
    exit:           t.exit,
    contracts:      t.contracts,
    points:         t.points,
    pl:             t.pl,
    setup:          t.setup,
    source:         t.source || "manual",
    rule_followed:  t.ruleFollowed,
    inside_window:  t.insideWindow,
    inside_plan:    t.insidePlan,
    mistake:        t.mistake,
    notes:          t.notes,
    session_open:   t.sessionOpen,
    session_low:    t.sessionLow,
    session_high:   t.sessionHigh,
    peak_time:      t.peakTime,
    peak_block:     t.peakBlock,
    pullback:       t.pullback,
    high_move:      t.highMove,
    recovery:       t.recovery,
    recovery_pct:   t.recoveryPct,
    giveback:       t.giveback,
    emotional_state: t.emotionalState,
    lesson_learned:  t.lessonLearned
  };
}

function dbRowToTrade(r) {
  return {
    _id:           r.id,
    date:          r.date,
    time:          r.time,
    day:           r.day,
    symbol:        r.symbol,
    direction:     r.direction,
    entry:         Number(r.entry),
    exit:          Number(r.exit),
    contracts:     Number(r.contracts),
    points:        Number(r.points),
    pl:            Number(r.pl),
    setup:         r.setup,
    source:        r.source || "manual",
    ruleFollowed:  r.rule_followed,
    insideWindow:  r.inside_window,
    insidePlan:    r.inside_plan,
    mistake:       r.mistake,
    notes:         r.notes,
    sessionOpen:   r.session_open   !== null ? Number(r.session_open)  : null,
    sessionLow:    r.session_low    !== null ? Number(r.session_low)   : null,
    sessionHigh:   r.session_high   !== null ? Number(r.session_high)  : null,
    peakTime:      r.peak_time,
    peakBlock:     r.peak_block,
    pullback:      r.pullback       !== null ? Number(r.pullback)      : null,
    highMove:      r.high_move      !== null ? Number(r.high_move)     : null,
    recovery:      r.recovery       !== null ? Number(r.recovery)      : null,
    recoveryPct:   r.recovery_pct   !== null ? Number(r.recovery_pct)  : null,
    giveback:      r.giveback       !== null ? Number(r.giveback)      : null,
    emotionalState: r.emotional_state,
    lessonLearned:  r.lesson_learned
  };
}

/* ============================================================
   APP STATE
   ============================================================ */
const form  = document.getElementById("tradeForm");
const table = document.getElementById("tradeTable");

let trades = [];
// Cargar cache local mientras Supabase trae los datos reales
try {
  const _cache = localStorage.getItem("dygpro_trades_cache");
  if (_cache) trades = JSON.parse(_cache);
} catch(e) {}
// Cache local temporal — se sobreescribe cuando llegan datos de Supabase
try {
  const cached = localStorage.getItem("dygpro_trades_cache");
  if (cached) trades = JSON.parse(cached);
} catch(e) {}
let personalNotes = {};
let equityChart;
let monteCarloChart;

// Valor por punto de cada instrumento en USD
const pointValue = {
  MNQ: 2, NQ: 20, ES: 50, MES: 5,
  MYM: 0.5, YM: 5,
  MGC: 10, GC: 100,
  CL: 1000, MCL: 100,
  BTC: 1, ETH: 1,
};

function getPointValue(symbol) {
  if (!symbol) return 1;
  const s = String(symbol).toUpperCase().trim();
  if (pointValue[s]) return pointValue[s];
  // Check custom symbols
  try {
    const customs = JSON.parse(localStorage.getItem("dygpro_custom_symbols") || "{}");
    if (customs[s]) return customs[s];
  } catch(e) {}
  return 1;
}
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

form.addEventListener("submit", async function(e) {
  e.preventDefault();
  if (viewingStudent) return;
  if (!checkTradeLimit()) return;

  const date      = val("date");
  const time      = val("time") || "09:30";
  const symbol    = getSelectedSymbol() || val("symbol") || "CUSTOM";
  const direction = val("direction") || "Long";
  const entry     = num("entry") || 0;
  const exit      = num("exit") || 0;
  const contracts = num("contracts") || 1;
  const setup     = val("setup") || "Sin setup";
  const ruleFollowed   = val("ruleFollowed") || "yes";

  // Solo la fecha es obligatoria
  if (!date) { showToast('⚠️ Fecha requerida', 'La fecha es el único campo obligatorio.'); return; }
  const mistake        = val("mistake");
  const notes          = val("notes");
  const emotionalState = val("emotionalState");
  const lessonLearned  = val("lessonLearned");

  const sessionOpen = optionalNum("sessionOpen");
  const sessionLow  = optionalNum("sessionLow");
  const sessionHigh = optionalNum("sessionHigh");
  const peakTime    = val("peakTime");

  const instrumentType = document.getElementById("instrumentType")?.value || "futures";
  const points = direction === "Long" ? exit - entry : entry - exit;
  const directPL = instrumentType !== "futures" ? getInstrumentPL() : null;
  const pl = directPL !== null && directPL !== 0
    ? directPL
    : points * getPointValue(symbol) * contracts;

  const insideWindow = isInsidePlanWindow(date, time);
  const insidePlan   = insideWindow && ruleFollowed === "yes";

  const d   = new Date(`${date}T${time}`);
  const day = dayNames[d.getDay()];

  const pullback    = sessionOpen !== null && sessionLow  !== null ? sessionOpen - sessionLow  : null;
  const highMove    = sessionOpen !== null && sessionHigh !== null ? sessionHigh - sessionOpen : null;
  const recovery    = pullback !== null ? points + pullback : null;
  const recoveryPct = pullback && pullback > 0 ? recovery / pullback * 100 : null;
  const giveback    = highMove !== null ? highMove - points : null;
  const peakBlock   = peakTime ? getPeakBlock(peakTime) : "-";

  const trade = {
    date, time, day, symbol, direction, entry, exit, contracts,
    points, pl, setup, ruleFollowed, insideWindow, insidePlan,
    mistake, notes, emotionalState, lessonLearned,
    sessionOpen, sessionLow, sessionHigh,
    peakTime, peakBlock, pullback, highMove, recovery, recoveryPct, giveback
  };

  const submitBtn = form.querySelector("button[type='submit']");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Guardando..."; }

  let saveOk = false;
  try {
    const result = await Promise.race([
      saveTradeToSupabase(trade),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    if (result) {
      saveOk = true;
    } else {
      showToast('⚠️ Error al guardar', 'La base de datos rechazó el registro. Revisa la consola (F12) para más detalles.');
    }
  } catch(e) {
    console.log('Save trade error:', e.message);
    showToast('⚠️ Error al guardar', 'No se pudo conectar con Supabase. Intenta de nuevo.');
  } finally {
    form.reset();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Guardar Registro"; }
  }

  if (saveOk) {
    showToast('✅ Trade guardado', `${trade.symbol} ${trade.direction} · ${trade.date}`);
    loadTradesFromSupabase();
  }
});

function val(id) { return document.getElementById(id)?.value || ""; }
function num(id) { return Number(document.getElementById(id)?.value || 0); }
function optionalNum(id) {
  const el = document.getElementById(id);
  if (!el || el.value === "") return null;
  return Number(el.value);
}

function save() { /* No-op: guardado en Supabase */ }

function isInsidePlanWindow(date, time) {
  const cfg = systemConfig;
  const d = new Date(`${date}T${time}`);
  const day = d.getDay();
  const minutes = d.getHours() * 60 + d.getMinutes();

  // Si el trader no configuró nada, todo es válido (neutral)
  if (!cfg || cfg.tradingDays.length === 0) return true;

  // Día de inicio con hora de inicio
  if (day === cfg.startDay && minutes >= cfg.startHour * 60) return true;

  // Días que son válidos todo el día
  if (cfg.allDayDays.includes(day)) return true;

  // Día de fin con hora de fin
  if (day === cfg.endDay && minutes <= cfg.endHour * 60) return true;

  return false;
}

function getPeakBlock(peakTime) {
  const hour = Number(peakTime.split(":")[0]);
  if (hour >= 18 && hour <= 23) return "6PM-11PM";
  if (hour >= 0 && hour <= 8) return "12AM-8AM";
  if (hour === 9) return "9AM";
  if (hour === 10) return "10AM";
  if (hour === 11) return "11AM";
  if (hour === 12) return "12PM";
  if (hour === 13) return "1PM";
  return "2PM+";
}

function render() {
  // Filtro combinado: source + fechas
  let activeTrades = getSourceFilteredTrades(trades);
  if (equityFilterStart || equityFilterEnd) {
    activeTrades = getEquityFilteredTrades();
  }

  renderHistory(activeTrades);
  renderDashboard(activeTrades);
  renderChart();
  renderResearchCenter(activeTrades);
  renderPeakDistribution(activeTrades);
  renderSessionDatabase(activeTrades);
  renderPLCalendar(activeTrades);
  renderDisciplineEngine(activeTrades);
  renderPerformanceRatios(activeTrades);
  renderSystemScorecard(activeTrades);
  renderAccountSizeEngine(activeTrades);
  renderRecoveryAnalytics(activeTrades);
  renderMonteCarloPanel(activeTrades);
  renderSetupQualityScore(activeTrades);
  renderSystemDriftMonitor(activeTrades);
}

function renderHistory(activeTrades) {
  activeTrades = activeTrades || trades;
  if (!table) return;
  table.innerHTML = "";

  activeTrades.forEach((t, index) => {
    table.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.time}</td>
        <td>${t.day}</td>
        <td>${t.symbol} ${getSourceBadge(t.source || "manual")}</td>
        <td>${t.direction}</td>
        <td>${t.entry ? Number(t.entry).toFixed(2) : "-"}</td>
        <td>${t.exit  ? Number(t.exit).toFixed(2)  : "-"}</td>
        <td class="${t.points >= 0 ? "win" : "loss"}">${Number(t.points).toFixed(2)}</td>
        <td class="${t.pl >= 0 ? "win" : "loss"}">${money(t.pl)}</td>
        <td class="${t.insidePlan ? "plan-ok" : "plan-bad"}">${t.insidePlan ? "Dentro" : "Rompió"}</td>
        <td>${t.mistake || "-"}</td>
        <td><button class="delete-btn" onclick="deleteTrade('${t._id}')">X</button></td>
      </tr>
    `;
  });
}

function renderDashboard(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const total = trades.length;
  const wins = trades.filter(t => t.pl > 0);
  const planTrades = trades.filter(t => t.insidePlan);
  const badTrades = trades.filter(t => !t.insidePlan);

  const totalPLval = sum(trades, "pl");
  const winRateVal = total ? (wins.length / total * 100) : 0;
  const disciplineVal = total ? (planTrades.length / total * 100) : 0;
  const maxDDval = calculateMaxDrawdown(trades);

  setTextColor("totalPL", money(totalPLval), totalPLval >= 0 ? "var(--green)" : "var(--red)");
  setTextColor("planPL", money(sum(planTrades, "pl")), sum(planTrades,"pl") >= 0 ? "var(--green)" : "var(--red)");
  setTextColor("badPL", money(sum(badTrades, "pl")), badTrades.length > 0 ? "var(--red)" : "");
  setTextColor("winRate", winRateVal.toFixed(1) + "%", winRateVal >= 55 ? "var(--green)" : winRateVal >= 45 ? "var(--gold)" : "var(--red)");
  setTextColor("disciplineRate", disciplineVal.toFixed(1) + "%", disciplineVal >= 90 ? "var(--green)" : disciplineVal >= 70 ? "var(--gold)" : "var(--red)");
  setTextColor("maxDD", money(maxDDval), maxDDval > Math.abs(totalPLval) * 0.5 ? "var(--red)" : maxDDval > 0 ? "var(--gold)" : "");
  setText("outPlanTrades", badTrades.length + " trades");

  setText("avgPullback", avgText(valid(trades, "pullback"), " pts"));
  setText("avgHighMove", avgText(valid(trades, "highMove"), " pts"));
  setText("avgRecovery", avgText(valid(trades, "recoveryPct"), "%"));
  setText("bestPeakBlock", mostCommon(trades.map(t => t.peakBlock).filter(x => x && x !== "-")) || "-");

  const days = bestGroupByDay();
  setText("bestDay", days.best);
  setText("worstDay", days.worst);
}

function renderChart() {
  const ctx = document.getElementById("equityChart");
  if (!ctx || typeof Chart === "undefined") return;

  const labels = trades.map((_, i) => `${i + 1}`);
  let real = [], plan = [], bad = [];
  let realCum = 0, planCum = 0, badCum = 0;

  trades.forEach(t => {
    realCum += t.pl;
    if (t.insidePlan) planCum += t.pl;
    if (!t.insidePlan) badCum += t.pl;
    real.push(realCum);
    plan.push(planCum);
    bad.push(badCum);
  });

  if (equityChart) equityChart.destroy();

  equityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Equity Real", data: real, borderWidth: 3, tension: 0.35 },
        { label: "Equity Dentro del Plan", data: plan, borderWidth: 3, tension: 0.35 },
        { label: "Equity Fuera del Plan", data: bad, borderWidth: 3, tension: 0.35 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.08)" } },
        y: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,.08)" } }
      }
    }
  });
}

function renderResearchCenter(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const box = document.getElementById("researchBox");
  if (!box) return;

  if (!trades.length) {
    box.innerHTML = `<p class="muted">Todavía no hay datos. Importa o registra operaciones.</p>`;
    return;
  }

  const planTrades = trades.filter(t => t.insidePlan);
  const badTrades = trades.filter(t => !t.insidePlan);
  const planPL = sum(planTrades, "pl");
  const badPL = sum(badTrades, "pl");

  let insights = [];

  if (planPL > 0 && badPL < 0) {
    insights.push(["Sistema saludable", "El sistema gana dentro del plan, pero los trades fuera del plan están drenando la curva."]);
  }

  if (badTrades.length > 0) {
    insights.push(["Ruptura de plan detectada", `${badTrades.length} trades fueron marcados fuera del plan.`]);
  }

  const peak = mostCommon(trades.map(t => t.peakBlock).filter(x => x && x !== "-"));
  if (peak) insights.push(["Hora pico dominante", `El bloque más repetido es ${peak}.`]);

  const avgPB = average(valid(trades, "pullback"));
  if (avgPB !== null) insights.push(["Pullback promedio", `Pullback promedio: ${avgPB.toFixed(1)} puntos.`]);

  if (!insights.length) {
    insights.push(["Recolectando datos", "Aún faltan más registros para detectar patrones fuertes."]);
  }

  box.innerHTML = insights.map(i => `
    <div class="insight">
      <strong>${i[0]}</strong>
      <p>${i[1]}</p>
    </div>
  `).join("");
}

function renderPeakDistribution(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const container = document.getElementById("peakDistribution");
  if (!container) return;

  const blocks = ["6PM-11PM", "12AM-8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM+"];
  const validBlocks = trades.map(t => t.peakBlock).filter(x => x && x !== "-");
  const total = validBlocks.length || 1;

  container.innerHTML = blocks.map(block => {
    const count = validBlocks.filter(x => x === block).length;
    const pct = count / total * 100;

    return `
      <div class="dist-row">
        <span>${block}</span>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <strong>${count} / ${pct.toFixed(0)}%</strong>
      </div>
    `;
  }).join("");
}

function renderSessionDatabase(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const sessionTable = document.getElementById("sessionTable");
  if (!sessionTable) return;

  sessionTable.innerHTML = "";

  trades.forEach(t => {
    sessionTable.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.day}</td>
        <td>${t.entry ? Number(t.entry).toFixed(2) : "-"}</td>
        <td>${t.exit  ? Number(t.exit).toFixed(2)  : "-"}</td>
        <td>${t.sessionOpen ?? "-"}</td>
        <td>${formatPts(t.pullback)}</td>
        <td class="win">${formatPts(t.highMove)}</td>
        <td>${t.peakTime || "-"}</td>
        <td>${t.recoveryPct == null ? "-" : t.recoveryPct.toFixed(1) + "%"}</td>
        <td>${t.giveback == null ? "-" : t.giveback.toFixed(1)}</td>
        <td class="${t.pl >= 0 ? "win" : "loss"}">${money(t.pl)}</td>
        <td class="${t.insidePlan ? "plan-ok" : "plan-bad"}">${t.insidePlan ? "Dentro" : "Rompió"}</td>
      </tr>
    `;
  });
}

function renderPLCalendar(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const calendar = document.getElementById("plCalendar");
  if (!calendar) return;

  calendar.innerHTML = "";

  // Group by date — track PL and sources per day
  const byDate = {};
  trades.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = { pl: 0, sources: new Set() };
    byDate[t.date].pl += t.pl;
    byDate[t.date].sources.add(t.source || "manual");
  });

  const dates = Object.keys(byDate).sort();

  if (!dates.length) {
    calendar.innerHTML = `<p class="muted">No hay datos todavía para mostrar calendario.</p>`;
    return;
  }

  dates.forEach(date => {
    const { pl, sources } = byDate[date];
    const cls = pl > 0 ? "cal-win" : pl < 0 ? "cal-loss" : "cal-flat";

    // Build source badges for this day
    const sourceBadges = [...sources].map(s => getSourceBadge(s)).join(" ");

    calendar.innerHTML += `
      <div class="cal-day ${cls}">
        <div class="cal-date">${date}</div>
        <div style="margin:4px 0">${sourceBadges}</div>
        <div class="cal-pl">${money(pl)}</div>
      </div>
    `;
  });
}

async function deleteTrade(tradeId) {
  const trade = trades.find(t => t._id === tradeId);
  if (!trade) return;
  try {
    await deleteTradeFromSupabase(tradeId);
    // Eliminar del array local inmediatamente y renderizar
    const localIdx = trades.findIndex(t => t._id === tradeId);
    if (localIdx !== -1) trades.splice(localIdx, 1);
    render();
    showToast('🗑️ Trade eliminado', (trade.symbol || '') + ' ' + (trade.direction || '') + ' · ' + (trade.date || ''));
    // Recargar desde Supabase en background silenciosamente
    await loadTradesFromSupabase();
  } catch(e) {
    console.log('Delete trade error:', e.message);
    const idx = trades.findIndex(t => t._id === tradeId);
    if (idx !== -1) trades.splice(idx, 1);
    try { localStorage.setItem("dygpro_trades_cache", JSON.stringify(trades)); } catch(_) {}
    render();
    showToast('🗑️ Trade eliminado (local)', 'Se eliminó localmente. Verifica tu conexión.');
  }
}

function calculateMaxDrawdown(list) {
  let equity = 0, peak = 0, maxDD = 0;
  list.forEach(t => {
    equity += t.pl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  });
  return maxDD;
}

function sum(list, field) {
  return list.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
}

function valid(list, field) {
  return list.map(x => x[field]).filter(x => x !== null && x !== undefined && !Number.isNaN(x));
}

function average(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function avgText(arr, suffix) {
  const avg = average(arr);
  return avg === null ? "0" + suffix : avg.toFixed(1) + suffix;
}

function mostCommon(arr) {
  if (!arr.length) return null;
  const counts = {};
  arr.forEach(x => counts[x] = (counts[x] || 0) + 1);
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
}

function bestGroupByDay() {
  const map = {};
  trades.forEach(t => map[t.day] = (map[t.day] || 0) + t.pl);
  const entries = Object.entries(map);
  if (!entries.length) return { best: "-", worst: "-" };
  entries.sort((a, b) => b[1] - a[1]);
  return {
    best: `${entries[0][0]} ${money(entries[0][1])}`,
    worst: `${entries[entries.length - 1][0]} ${money(entries[entries.length - 1][1])}`
  };
}

function formatPts(value) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(1);
}

function money(value) {
  value = Number(value) || 0;
  return (value < 0 ? "-$" : "$") + Math.abs(value).toFixed(2);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setTextColor(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = color || "";
}

function parseSmartCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] ? values[i].trim() : "");
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') insideQuotes = !insideQuotes;
    else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else current += char;
  }

  result.push(current);
  return result;
}

function normalizeHeader(header) {
  return header.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function splitDateTime(value) {
  const parts = value.trim().split(" ");
  return [parts[0], parts[1] || "18:00"];
}

function detectSymbolFromFilename(filename) {
  const name = filename.toUpperCase();
  if (name.includes("MNQ")) return "MNQ";
  if (name.includes("NQ")) return "NQ";
  if (name.includes("MES")) return "MES";
  if (name.includes("ES")) return "ES";
  return "MNQ";
}

function importCSV(event) {
  if (viewingStudent) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseSmartCSV(text);

    if (!rows.length) {
      showToast('⚠️ CSV no reconocido', 'El archivo está vacío o no tiene el formato esperado.');
      return;
    }

    const headers = Object.keys(rows[0]);

    const isTV = headers.includes("tradenumber") &&
                 headers.includes("tipo") &&
                 headers.includes("fechayhora") &&
                 headers.includes("preciousd");

    const isWebull = headers.includes("symbol") &&
                     headers.includes("side") &&
                     headers.includes("status") &&
                     headers.includes("avgprice");

    const isTradovate = headers.includes("positionid") ||
                        (headers.includes("buyprice") && headers.includes("sellprice") && headers.includes("pairedqty"));

    let result;
    let formatName;
    if (isTV) {
      result = importTradingViewRows(rows, file.name);
      formatName = "TradingView Strategy Tester";
    } else if (isWebull) {
      result = importWebullRows(rows);
      formatName = "Webull";
    } else if (isTradovate) {
      result = importTradovateRows(rows);
      formatName = "Tradovate";
    } else {
      result = importUniversalRows(rows, headers);
      formatName = result.imported > 0 ? "CSV Universal" : "CSV";
    }

    // Guardar cada trade nuevo en Supabase
    const newTrades = trades.slice(-(result.imported));
    event.target.value = "";

    // Activar todos los filtros antes de mostrar
    const allSrcs = [...new Set(trades.map(t => (t.source || 'manual').toLowerCase()))];
    activeSourceFilters = new Set(allSrcs);
    try { localStorage.setItem('dygpro_source_filters', JSON.stringify([...activeSourceFilters])); } catch(e) {}

    if (currentUser && newTrades.length > 0) {
      showToast('⏳ Importando...', `Guardando ${result.imported} trades en la nube...`);
      Promise.all(newTrades.map(t => saveTradeToSupabase(t)))
        .then(() => loadTradesFromSupabase())
        .then(() => {
          showToast(
            `✅ ${formatName} importado`,
            `${result.imported} trade${result.imported !== 1 ? 's' : ''} guardado${result.imported !== 1 ? 's' : ''}. Ignorados: ${result.skipped}.`
          );
        })
        .catch(e => {
          console.error("Error guardando en Supabase:", e);
          showToast('⚠️ Error parcial', 'Algunos trades pueden no haberse guardado. Revisa tu conexión.');
          loadTradesFromSupabase();
        });
    } else {
      render();
      showToast(
        `✅ ${formatName} importado`,
        `${result.imported} trade${result.imported !== 1 ? 's' : ''} guardado${result.imported !== 1 ? 's' : ''}. Ignorados: ${result.skipped}.`
      );
    }
  };

  reader.readAsText(file);
}

function importTradingViewRows(rows, filename) {
  let imported = 0, skipped = 0;
  const grouped = {};

  rows.forEach(row => {
    const n = row.tradenumber;
    if (!n) return;
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(row);
  });

  Object.keys(grouped).forEach(n => {
    const group = grouped[n];
    const entryRow = group.find(r => (r.tipo || "").toLowerCase().includes("entrada"));
    const exitRow = group.find(r => (r.tipo || "").toLowerCase().includes("salida"));

    if (!entryRow || !exitRow) { skipped++; return; }

    const [date, time] = splitDateTime(entryRow.fechayhora);
    const entry = Number(entryRow.preciousd);
    const exit = Number(exitRow.preciousd);
    const contracts = Number(entryRow.tamanocant || entryRow.tamañocant || 1);
    const direction = (entryRow.tipo || "").toLowerCase().includes("corto") ? "Short" : "Long";
    const symbol = detectSymbolFromFilename(filename);
    const points = direction === "Long" ? exit - entry : entry - exit;
    const csvPnL = Number(exitRow.netpnlusd || 0);
    const pl = csvPnL !== 0 ? csvPnL : points * pointValue[symbol] * contracts;

    const insideWindow = isInsidePlanWindow(date, time);
    const d = new Date(`${date}T${time}`);

    if (!canAddTrade()) { skipped++; return; }

    trades.push({
      date, time, day: dayNames[d.getDay()], symbol, direction,
      entry, exit, contracts, points, pl,
      setup: "TradingView Strategy",
      source: "tradingview",
      ruleFollowed: "yes",
      insideWindow,
      insidePlan: insideWindow,
      mistake: "",
      notes: `Importado desde TradingView Strategy Tester. Trade #${n}`,
      sessionOpen: null,
      sessionLow: null,
      sessionHigh: null,
      peakTime: "",
      peakBlock: "-",
      pullback: null,
      highMove: Number(exitRow.desviacionfavorableusd || 0),
      recovery: null,
      recoveryPct: null,
      giveback: Number(exitRow.desviacionadversausd || 0)
    });

    imported++;
  });

  return { imported, skipped };
}

function importGenericRows(rows) {
  let imported = 0, skipped = 0;

  rows.forEach(row => {
    const date = row.date || row.fecha || row.tradedate || "";
    const time = row.time || row.hora || "18:00";
    const symbol = row.symbol || row.simbolo || row.instrument || "MNQ";
    const rawDir = row.direction || row.direccion || row.side || "Long";
    const entry = Number(row.entry || row.entrada || row.entryprice || 0);
    const exit = Number(row.exit || row.salida || row.exitprice || 0);
    const contracts = Number(row.contracts || row.contratos || row.qty || 1);

    if (!date || !entry || !exit) { skipped++; return; }

    const direction = rawDir.toLowerCase().includes("short") || rawDir.toLowerCase().includes("sell") ? "Short" : "Long";
    const points = direction === "Long" ? exit - entry : entry - exit;
    const pl = points * pointValue[symbol] * contracts;
    const insideWindow = isInsidePlanWindow(date, time);
    const d = new Date(`${date}T${time}`);

    if (!canAddTrade()) { skipped++; return; }

    trades.push({
      date, time, day: dayNames[d.getDay()], symbol, direction,
      entry, exit, contracts, points, pl,
      setup: row.setup || "Importado CSV",
      ruleFollowed: "yes",
      insideWindow,
      insidePlan: insideWindow,
      mistake: "",
      notes: "Importado desde CSV",
      sessionOpen: null,
      sessionLow: null,
      sessionHigh: null,
      peakTime: "",
      peakBlock: "-",
      pullback: null,
      highMove: null,
      recovery: null,
      recoveryPct: null,
      giveback: null
    });

    imported++;
  });

  return { imported, skipped };
}


/* ============================================================
   IMPORTADOR WEBULL
   ============================================================ */
function importWebullRows(rows) {
  let imported = 0, skipped = 0;

  // rows already have normalized keys (lowercase, no spaces)
  // placedtime, filledtime, symbol, side, status, avgprice, price, filled

  function cleanPrice(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace('@','').trim()) || 0;
  }

  function extractSymbol(raw) {
    const s = String(raw || '').toUpperCase().trim();
    // Remove futures contract suffix: letter + 1-2 digits at end (e.g. M6, H26)
    const base = s.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '');
    return base || s;
  }

  function parseWebullDate(dateStr) {
    // "06/03/2026 10:16:53 EDT" → { date: "2026-06-03", time: "10:16" }
    if (!dateStr) return { date: '', time: '09:30' };
    const clean = dateStr.replace(' EDT','').replace(' EST','').trim();
    const parts = clean.split(' ');
    const dateParts = (parts[0] || '').split('/');
    if (dateParts.length < 3) return { date: '', time: '09:30' };
    const date = `${dateParts[2]}-${dateParts[0].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`;
    const time = (parts[1] || '09:30').slice(0,5);
    return { date, time };
  }

  // Only filled orders
  const filled = rows.filter(r => (r.status || '').toLowerCase() === 'filled');

  // Group by date + symbol
  const grouped = {};
  filled.forEach(r => {
    const sym = extractSymbol(r.symbol || '');
    const { date } = parseWebullDate(r.placedtime || r.filledtime || '');
    const key = sym + '_' + date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...r, _sym: sym });
  });

  Object.values(grouped).forEach(orders => {
    // Sort by placed time ascending
    orders.sort((a, b) => (a.placedtime || '').localeCompare(b.placedtime || ''));

    const buys  = orders.filter(o => (o.side || '').toLowerCase() === 'buy');
    const sells = orders.filter(o => (o.side || '').toLowerCase() === 'sell');
    const pairs = Math.min(buys.length, sells.length);

    for (let i = 0; i < pairs; i++) {
      const buy  = buys[i];
      const sell = sells[i];

      const buyPrice  = cleanPrice(buy.avgprice  || buy.price);
      const sellPrice = cleanPrice(sell.avgprice || sell.price);
      const contracts = parseInt(buy.filled || buy.totalqty || 1) || 1;
      const sym = buy._sym;

      // Direction based on which was placed first
      const buyFirst = (buy.placedtime || '') <= (sell.placedtime || '');
      const direction = buyFirst ? 'Long' : 'Short';

      const entry  = direction === 'Long' ? buyPrice  : sellPrice;
      const exit   = direction === 'Long' ? sellPrice : buyPrice;
      const points = direction === 'Long' ? exit - entry : entry - exit;
      const pv     = getPointValue(sym);
      const pl     = points * pv * contracts;

      const entryOrder = direction === 'Long' ? buy : sell;
      const { date, time } = parseWebullDate(entryOrder.placedtime || entryOrder.filledtime || '');

      if (!date || (!buyPrice && !sellPrice)) { skipped++; continue; }

      const d       = new Date(`${date}T${time}`);
      const dayName = dayNames[d.getDay()];
      const insideWindow = isInsidePlanWindow(date, time);

      if (!canAddTrade()) { skipped++; continue; }

      trades.push({
        date, time, day: dayName, symbol: sym, direction,
        entry, exit, contracts, points, pl,
        setup: 'Webull Import',
        source: 'webull',
        ruleFollowed: 'yes',
        insideWindow, insidePlan: insideWindow,
        mistake: '', notes: `Webull: ${sym} ${direction} — Entry: ${entry} / Exit: ${exit}`,
        emotionalState: '', lessonLearned: '',
        sessionOpen: null, sessionLow: null, sessionHigh: null,
        peakTime: '', peakBlock: '-',
        pullback: null, highMove: null, recovery: null, recoveryPct: null, giveback: null
      });
      imported++;
    }
  });

  return { imported, skipped };
}


/* ============================================================
   IMPORTADOR TRADOVATE
   ============================================================ */
function importTradovateRows(rows) {
  let imported = 0, skipped = 0;

  function extractSymbol(raw) {
    const s = String(raw || '').toUpperCase().trim();
    return s.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '') || s;
  }

  function parseDate(raw) {
    if (!raw) return { date: '', time: '09:30' };
    // "06/01/2026 09:33:21" or "2026-06-01"
    const clean = raw.trim();
    if (clean.includes('-') && !clean.includes('/')) {
      return { date: clean.slice(0,10), time: '09:30' };
    }
    const parts = clean.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const date = `${dateParts[2]}-${dateParts[0].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`;
      const time = parts[1] ? parts[1].slice(0,5) : '09:30';
      return { date, time };
    }
    return { date: '', time: '09:30' };
  }

  rows.forEach(r => {
    // Support both "Buy Price"/"Sell Price" and "Avg. Buy"/"Avg. Sell"
    const buyPrice  = parseFloat(r.buyprice  || r.avgbuy  || r.buy  || 0);
    const sellPrice = parseFloat(r.sellprice || r.avgsell || r.sell || 0);
    const pl        = parseFloat(r['p/l'] || r.pl || r.pnl || r.profit || 0);
    const sym       = extractSymbol(r.product || r.symbol || r.contract || '');
    const contracts = parseInt(r.pairedqty || r.bought || r.qty || r.quantity || 1) || 1;

    // Entry timestamp for direction
    const boughtTs = r.boughttimestamp || r.placedtime || '';
    const soldTs   = r.soldtimestamp   || r.filledtime || '';
    const direction = boughtTs <= soldTs ? 'Long' : 'Short';

    const entry = direction === 'Long' ? buyPrice  : sellPrice;
    const exit  = direction === 'Long' ? sellPrice : buyPrice;
    const points = entry && exit ? (direction === 'Long' ? exit - entry : entry - exit) : 0;

    const { date, time } = parseDate(r.boughttimestamp || r.tradedate || r.timestamp || '');

    if (!date || (!buyPrice && !sellPrice)) { skipped++; return; }

    const d = new Date(`${date}T${time}`);
    const dayName = dayNames[d.getDay()];
    const insideWindow = isInsidePlanWindow(date, time);

    if (!canAddTrade()) { skipped++; return; }

    trades.push({
      date, time, day: dayName, symbol: sym, direction,
      entry, exit, contracts, points,
      pl: pl || points * getPointValue(sym) * contracts,
      setup: 'Tradovate Import', source: 'tradovate', ruleFollowed: 'yes',
      insideWindow, insidePlan: insideWindow,
      mistake: '', notes: `Tradovate: ${sym} ${direction}`,
      emotionalState: '', lessonLearned: '',
      sessionOpen: null, sessionLow: null, sessionHigh: null,
      peakTime: '', peakBlock: '-',
      pullback: null, highMove: null, recovery: null, recoveryPct: null, giveback: null
    });
    imported++;
  });

  return { imported, skipped };
}

/* ============================================================
   IMPORTADOR UNIVERSAL INTELIGENTE
   ============================================================ */
function parseUniversalDate(raw) {
  if (!raw) return { date: '', time: '09:30' };
  raw = raw.trim();
  let date = '', time = '09:30';
  // YYYY-MM-DD or YYYY/MM/DD
  let m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // MM/DD/YYYY or MM-DD-YYYY
  if (!date) { m = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); if (m) date = `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; }
  // DD.MM.YYYY
  if (!date) { m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (m) date = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  // Time HH:MM or HH:MM:SS
  const tm = raw.match(/(\d{2}:\d{2})/);
  if (tm) time = tm[1];
  return { date, time };
}

function parseUniversalPL(raw) {
  if (!raw) return 0;
  // Remove currency symbols, spaces, parentheses (negative)
  const neg = raw.includes('(') || raw.includes('-');
  const val = parseFloat(raw.replace(/[$€£,()\s]/g, '').replace(/^-/, '')) || 0;
  return neg ? -val : val;
}

function importUniversalRows(rows, headers) {
  let imported = 0, skipped = 0;

  // Smart column finder — checks exact match first, then partial
  function findCol(...candidates) {
    for (const c of candidates) {
      const exact = headers.find(h => h === c);
      if (exact) return exact;
    }
    for (const c of candidates) {
      const partial = headers.find(h => h.includes(c));
      if (partial) return partial;
    }
    return null;
  }

  const colDate   = findCol('date','datetime','timestamp','time','fecha','tradedate','closetime','opentime','closedate','opendate');
  const colSym    = findCol('symbol','ticker','instrument','product','contract','asset','market','pair');
  const colPL     = findCol('pl','pnl','profit','gain','netloss','netpl','netprofit','realizedpl','realizedpnl','net','grosspnl','closedpl');
  const colEntry  = findCol('entry','entryprice','openprice','buy','buyprice','avgbuy','avgentryprice','open');
  const colExit   = findCol('exit','exitprice','closeprice','sell','sellprice','avgsell','avgexitprice','close');
  const colQty    = findCol('qty','quantity','contracts','size','volume','shares','filled','pairedqty','lots');
  const colDir    = findCol('side','direction','type','action','buysell','postype','tradetype');
  const colDate2  = colDate ? null : findCol('exitdate','closedate','exitdatetime'); // fallback date

  const effectiveColDate = colDate || colDate2;

  rows.forEach(r => {
    // Date
    const { date, time } = parseUniversalDate(r[effectiveColDate] || '');
    if (!date) { skipped++; return; }

    // Symbol
    const rawSym = (r[colSym] || 'CUSTOM').toUpperCase().trim();
    const sym = rawSym.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '').replace(/\s+/g,'').trim() || 'CUSTOM';

    // P/L
    let pl = colPL ? parseUniversalPL(r[colPL]) : 0;

    // Prices
    const entry = parseFloat(r[colEntry] || 0) || 0;
    const exit  = parseFloat(r[colExit]  || 0) || 0;

    // Direction
    const rawDir = (r[colDir] || '').toLowerCase();
    let direction = 'Long';
    if (rawDir.includes('sell') || rawDir.includes('short') || rawDir.includes('s')) direction = 'Short';
    else if (rawDir.includes('buy') || rawDir.includes('long') || rawDir.includes('b')) direction = 'Long';
    // Auto-detect from prices if no direction column
    if (!colDir && entry && exit) {
      direction = exit >= entry ? 'Long' : 'Short';
    }

    // Contracts
    const contracts = Math.abs(parseInt(r[colQty] || 1)) || 1;

    // Points and P/L
    const points = entry && exit
      ? (direction === 'Long' ? exit - entry : entry - exit)
      : 0;
    const finalPL = pl || (points ? points * getPointValue(sym) * contracts : 0);

    // Skip rows with no useful data
    if (!finalPL && !points && !entry && !exit) { skipped++; return; }

    const d = new Date(`${date}T${time}`);
    const dayName = dayNames[d.getDay()];
    const insideWindow = isInsidePlanWindow(date, time);

    if (!canAddTrade()) { skipped++; return; }

    trades.push({
      date, time, day: dayName,
      symbol: sym, direction,
      entry: entry || null, exit: exit || null,
      contracts, points: parseFloat(points.toFixed(4)),
      pl: parseFloat((finalPL).toFixed(2)),
      setup: 'Universal Import', source: 'universal', ruleFollowed: 'yes',
      insideWindow, insidePlan: insideWindow,
      mistake: '', notes: `Importado: ${sym}`,
      emotionalState: '', lessonLearned: '',
      sessionOpen: null, sessionLow: null, sessionHigh: null,
      peakTime: '', peakBlock: '-',
      pullback: null, highMove: null, recovery: null, recoveryPct: null, giveback: null
    });
    imported++;
  });

  return { imported, skipped };
}

document.getElementById("csvFile")?.addEventListener("change", importCSV);
document.getElementById("exportCSV")?.addEventListener("click", function() {
  if (!trades.length) {
    showToast('⚠️ Sin datos', 'No hay trades para exportar.');
    return;
  }

  const headers = [
    "Fecha","Hora","Dia","Simbolo","Direccion","Entrada","Salida","Contratos",
    "Puntos","PL","Setup","Regla","DentroPlan","Error","Notas",
    "SessionOpen","SessionLow","SessionHigh","PeakTime","Pullback","HighMove","RecoveryPct"
  ];

  const rows = trades.map(t => [
    t.date, t.time, t.day, t.symbol, t.direction,
    t.entry, t.exit, t.contracts, t.points, t.pl,
    t.setup, t.ruleFollowed, t.insidePlan ? "Dentro" : "Fuera",
    t.mistake || "", (t.notes || "").replace(/,/g, ";"),
    t.sessionOpen ?? "", t.sessionLow ?? "", t.sessionHigh ?? "",
    t.peakTime || "", t.pullback ?? "", t.highMove ?? "", t.recoveryPct ?? ""
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${v}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `DYGPRO_trades_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("clearData")?.addEventListener("click", function() {
  if (viewingStudent) return;
  const ok = confirm("¿Seguro que quieres borrar todos los datos?");
  if (!ok) return;
  trades = [];
  save();
  render();
});

function renderDisciplineEngine(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  let score = 100;

  const outPlan = trades.filter(t => !t.insidePlan);
  score -= outPlan.length * 10;

  const mistakes = {};
  let mistakeCost = 0;

  trades.forEach(t => {
    if (!t.insidePlan && t.pl < 0) {
      mistakeCost += Math.abs(t.pl);
    }

    if (t.mistake && t.mistake.trim() !== "") {
      mistakes[t.mistake] = (mistakes[t.mistake] || 0) + 1;
      score -= 5;
    }

    if (t.day === "Jue") score -= 15;
    if (t.day === "Vie") score -= 15;
  });

  score = Math.max(0, score);

  let status = "🟢 Excelente";
  if (score < 90) status = "🟡 Precaución";
  if (score < 75) status = "🟠 Riesgo";
  if (score < 60) status = "🔴 Peligro";

  let mostBroken = "-";
  let highest = 0;

  Object.keys(mistakes).forEach(rule => {
    if (mistakes[rule] > highest) {
      highest = mistakes[rule];
      mostBroken = rule;
    }
  });

  setText("disciplineScore", score + "/100");
  setText("disciplineStatus", status);
  setText("mostBrokenRule", mostBroken);
  setText("mistakeCost", money(-mistakeCost));
}


function renderPerformanceRatios(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const wins = trades.filter(t => t.pl > 0);
  const losses = trades.filter(t => t.pl < 0);

  const grossWin = sum(wins, "pl");
  const grossLoss = Math.abs(sum(losses, "pl"));

  const avgWinValue = wins.length ? grossWin / wins.length : 0;
  const avgLossValue = losses.length ? grossLoss / losses.length : 0;

  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
  const payoffRatio = avgLossValue > 0 ? avgWinValue / avgLossValue : avgWinValue > 0 ? 999 : 0;

  const winRate = trades.length ? wins.length / trades.length : 0;
  const lossRate = trades.length ? losses.length / trades.length : 0;

  const expectancy = (winRate * avgWinValue) - (lossRate * avgLossValue);
  const realRR = avgLossValue > 0 ? avgWinValue / avgLossValue : 0;

  setTextColor("profitFactor", profitFactor === 999 ? "∞" : profitFactor.toFixed(2),
    profitFactor >= 1.5 ? "var(--green)" : profitFactor >= 1 ? "var(--gold)" : "var(--red)");
  setTextColor("payoffRatio", payoffRatio === 999 ? "∞" : payoffRatio.toFixed(2),
    payoffRatio >= 1.5 ? "var(--green)" : payoffRatio >= 1 ? "var(--gold)" : "var(--red)");
  setTextColor("avgWin", money(avgWinValue), avgWinValue > 0 ? "var(--green)" : "");
  setTextColor("avgLoss", money(-avgLossValue), avgLossValue > 0 ? "var(--red)" : "");
  setTextColor("expectancy", money(expectancy), expectancy > 0 ? "var(--green)" : "var(--red)");
  setTextColor("realRR", realRR.toFixed(2) + "R", realRR >= 1.5 ? "var(--green)" : realRR >= 1 ? "var(--gold)" : "var(--red)");
}



// Borrar trades por fuente
async function deleteBySource(source) {
  if (viewingStudent) return;
  const sourceLabel = { tradingview: 'TradingView', webull: 'Webull', tradovate: 'Tradovate', manual: 'Manuales' }[source] || source;
  const count = trades.filter(t => (t.source || 'manual').toLowerCase() === source).length;
  if (count === 0) { showToast('⚠️ Sin trades', `No hay trades de ${sourceLabel} para borrar.`); return; }

  const ok = confirm(`¿Borrar los ${count} trades de ${sourceLabel}? Esta acción no se puede deshacer.`);
  if (!ok) return;

  const toDelete = trades.filter(t => (t.source || 'manual').toLowerCase() === source);
  trades = trades.filter(t => (t.source || 'manual').toLowerCase() !== source);

  if (currentUser) {
    await Promise.all(toDelete.map(t => t._id
      ? _supabase.from('trades').delete().eq('id', t._id).eq('user_id', currentUser.id)
      : Promise.resolve()
    ));
  }

  render();
  showToast(`🗑️ ${sourceLabel} eliminado`, `${count} trade${count !== 1 ? 's' : ''} eliminado${count !== 1 ? 's' : ''}.`);
  loadTradesFromSupabase();
}

// Botón borrar todo
document.getElementById("clearData")?.addEventListener("click", async function() {
  if (viewingStudent) return;
  const ok = confirm("¿Seguro que quieres borrar TODOS los trades? Esta acción no se puede deshacer.");
  if (!ok) return;

  trades = [];
  if (currentUser) {
    await _supabase.from("trades").delete().eq("user_id", currentUser.id);
  }
  render();
  showToast('🗑️ Historial borrado', 'Todos los trades fueron eliminados.');
});

document.getElementById("historyExportBtn")?.addEventListener("click", function() {
  document.getElementById("exportCSV")?.click();
});

document.getElementById("historyClearBtn")?.addEventListener("click", async function() {
  if (viewingStudent) return;

  const ok = confirm(
    "¿Seguro que deseas borrar TODAS las operaciones?"
  );

  if (!ok) return;

  trades = [];
  if (currentUser) {
    await _supabase.from("trades").delete().eq("user_id", currentUser.id);
  }
  render();
  showToast('🗑️ Historial eliminado', 'Los datos han sido eliminados correctamente.');
});

function renderSystemScorecard(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  if (!document.getElementById("systemRating")) return;

  const total = trades.length;

  if (total < 3) {
    setText("systemRating", "0.0 / 10");
    setText("systemRatingStatus", "Sin datos suficientes");
    setText("systemDiagnosis", "Necesitamos al menos 3 operaciones para empezar a valorar el sistema.");
    setList("systemImprovements", ["Importa más operaciones o registra trades manuales."]);
    return;
  }

  const wins = trades.filter(t => t.pl > 0);
  const losses = trades.filter(t => t.pl < 0);
  const planTrades = trades.filter(t => t.insidePlan);
  const badTrades = trades.filter(t => !t.insidePlan);

  const grossWin = sum(wins, "pl");
  const grossLoss = Math.abs(sum(losses, "pl"));

  const totalPL = sum(trades, "pl");
  const planPL = sum(planTrades, "pl");
  const badPL = sum(badTrades, "pl");

  const winRate = wins.length / total;
  const discipline = planTrades.length / total;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3 : 0;
  const expectancy = totalPL / total;
  const maxDD = calculateMaxDrawdown(trades);

  const avgWinValue = wins.length ? grossWin / wins.length : 0;
  const avgLossValue = losses.length ? grossLoss / losses.length : 0;
  const realRR = avgLossValue > 0 ? avgWinValue / avgLossValue : 0;

  let score = 0;

  // Profit Factor: máximo 2 puntos
  score += Math.min(profitFactor / 2, 1) * 2;

  // Expectancy positiva: máximo 2 puntos
  if (expectancy > 0) score += 2;
  else if (expectancy === 0) score += 0.75;

  // Disciplina: máximo 2 puntos
  score += discipline * 2;

  // Winrate: máximo 1 punto
  score += Math.min(winRate / 0.55, 1) * 1;

  // RR real: máximo 1 punto
  score += Math.min(realRR / 1.5, 1) * 1;

  // Drawdown: máximo 1 punto
  if (totalPL > 0) {
    const ddRatio = maxDD / Math.max(totalPL, 1);
    if (ddRatio < 0.25) score += 1;
    else if (ddRatio < 0.50) score += 0.6;
    else if (ddRatio < 1.00) score += 0.3;
  } else if (maxDD === 0) {
    score += 0.5;
  }

  // P/L dentro del plan vs fuera: máximo 1 punto
  if (planPL > 0 && badPL <= 0) score += 1;
  else if (planPL > 0) score += 0.7;
  else if (badPL > planPL) score += 0.2;

  score = Math.max(0, Math.min(10, score));

  let status = "🔴 Débil";
  if (score >= 8.5) status = "🟢 Fuerte";
  else if (score >= 7) status = "🟢 Bueno";
  else if (score >= 5.5) status = "🟡 Prometedor";
  else if (score >= 4) status = "🟠 Riesgoso";

  let diagnosis = "";
  const improvements = [];

  if (planPL > 0 && badPL < 0) {
    diagnosis = "El sistema muestra ventaja dentro del plan, pero las operaciones fuera del plan están reduciendo el rendimiento real.";
    improvements.push("Reducir o eliminar operaciones fuera de la ventana válida.");
  } else if (planPL > 0 && totalPL > 0) {
    diagnosis = "El sistema muestra comportamiento saludable. La ventaja viene principalmente de operaciones alineadas con el plan.";
  } else if (planPL < 0 && planTrades.length >= 3) {
    diagnosis = "La pérdida viene de operaciones dentro del plan. Hay que revisar la lógica del sistema, filtros o condiciones de entrada.";
    improvements.push("Revisar setup, horario y filtro de mercado antes de aumentar tamaño.");
  } else {
    diagnosis = "El sistema todavía no tiene evidencia suficiente o clara. Se necesita más muestra para una valoración fuerte.";
  }

  if (profitFactor < 1.2) improvements.push("Mejorar Profit Factor: reducir pérdidas o filtrar entradas débiles.");
  if (expectancy <= 0) improvements.push("Expectancy negativa: cada trade promedio no está pagando. Revisar reglas.");
  if (discipline < 0.85) improvements.push("Subir disciplina por encima de 85%.");
  if (realRR < 1) improvements.push("El RR real está bajo: las ganadoras no compensan suficiente.");
  if (badTrades.length > 0) improvements.push(`Hay ${badTrades.length} trades fuera del plan. Separarlos del análisis del sistema.`);
  if (!improvements.length) improvements.push("Mantener ejecución y seguir acumulando muestra.");

  setText("systemRating", score.toFixed(1) + " / 10");
  setText("systemRatingStatus", status);
  setText("systemDiagnosis", diagnosis);
  setList("systemImprovements", improvements);
}

function setList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(item => `<li>${item}</li>`).join("");
}



function renderAccountSizeEngine(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  if (!document.getElementById("accountAggressive")) return;

  if (!trades.length) {
    setText("accountMinimum",    "$0.00");
    setText("accountAggressive", "$0.00");
    setText("accountBalanced",   "$0.00");
    setText("accountConservative","$0.00");
    setText("accountStatus", "Sin datos aún");
    setText("accountAdvice", "Registra o importa operaciones para calcular tu capital recomendado.");
    return;
  }

  const maxDD     = calculateMaxDrawdown(trades);
  const totalPL   = sum(trades, "pl");
  const losses    = trades.filter(t => t.pl < 0);
  const avgLoss   = losses.length ? Math.abs(sum(losses, "pl")) / losses.length : 0;
  const worstLoss = losses.length ? Math.max(...losses.map(t => Math.abs(t.pl))) : 0;

  // Base de riesgo: el mayor entre el maxDD real, 3x la peor pérdida, o 6x el promedio de pérdidas
  const baseRisk = Math.max(maxDD, worstLoss * 3, avgLoss * 6, 500);

  const minimum     = baseRisk * 1;   // DD x 1 — mínimo absoluto
  const recommended = baseRisk * 2;   // DD x 2 — recomendado
  const comfortable = baseRisk * 4;   // DD x 4 — cómodo
  const professional = baseRisk * 6;  // DD x 6 — profesional

  let status = "🟡 Sistema en observación";
  let advice  = "Necesitas más operaciones para una lectura sólida. Con 20+ trades el cálculo será más preciso.";

  if (trades.length >= 20 && totalPL > 0 && maxDD > 0) {
    status = "🟢 Sistema capitalizable";
    advice  = `Tu peor racha histórica fue ${money(maxDD)}. La Cuenta Recomendada (${money(recommended)}) es tu punto de entrada real.`;
  }

  if (totalPL < 0) {
    status = "🔴 No escalar capital";
    advice  = "El sistema está en pérdidas netas. No aumentes el tamaño hasta que la curva de equity sea positiva.";
  }

  if (maxDD > Math.abs(totalPL) && totalPL > 0) {
    status = "🟠 Drawdown elevado";
    advice  = "Tu drawdown supera tu ganancia neta. Opera con la Cuenta Cómoda o reduce contratos hasta que la relación mejore.";
  }

  setText("accountMinimum",     money(minimum));
  setText("accountAggressive",  money(recommended));
  setText("accountBalanced",    money(comfortable));
  setText("accountConservative",money(professional));
  setText("accountStatus", status);
  setText("accountAdvice", advice);
}



function renderRecoveryAnalytics(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  if (!document.getElementById("recoveryFactor")) return;

  if (!trades.length) {
    setText("recoveryFactor", "0.00");
    setText("recoveryFactorStatus", "Sin datos");
    setText("recoveryTime", "0 trades");
    setText("worstLosingStreak", "0");
    setText("worstLosingStreakLoss", "$0.00");
    return;
  }

  const netProfit = sum(trades, "pl");
  const maxDD = calculateMaxDrawdown(trades);

  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : netProfit > 0 ? 999 : 0;

  let rfStatus = "🔴 Débil";
  if (recoveryFactor >= 10) rfStatus = "🟢 Elite";
  else if (recoveryFactor >= 6) rfStatus = "🟢 Excelente";
  else if (recoveryFactor >= 3) rfStatus = "🟡 Bueno";
  else if (recoveryFactor >= 1) rfStatus = "🟠 Aceptable";

  const recoveryTime = calculateWorstDrawdownRecoveryTime(trades);
  const losingStreak = calculateWorstLosingStreak(trades);

  setText("recoveryFactor", recoveryFactor === 999 ? "∞" : recoveryFactor.toFixed(2));
  setText("recoveryFactorStatus", rfStatus);
  setText("recoveryTime", recoveryTime + " trades");
  setText("worstLosingStreak", losingStreak.count + " trades");
  setText("worstLosingStreakLoss", money(-losingStreak.loss));
}

function calculateWorstDrawdownRecoveryTime(list) {
  let equity = 0;
  let peak = 0;
  let peakIndex = 0;

  let worstDD = 0;
  let worstStartIndex = 0;
  let worstEndIndex = 0;

  list.forEach((t, i) => {
    equity += Number(t.pl) || 0;

    if (equity > peak) {
      peak = equity;
      peakIndex = i;
    }

    const dd = peak - equity;

    if (dd > worstDD) {
      worstDD = dd;
      worstStartIndex = peakIndex;
      worstEndIndex = i;
    }
  });

  if (worstDD === 0) return 0;

  let recoveryEquity = 0;
  let targetPeak = 0;

  for (let i = 0; i <= worstStartIndex; i++) {
    recoveryEquity += Number(list[i].pl) || 0;
    if (recoveryEquity > targetPeak) targetPeak = recoveryEquity;
  }

  let equityAfterDD = 0;
  for (let i = 0; i <= worstEndIndex; i++) {
    equityAfterDD += Number(list[i].pl) || 0;
  }

  for (let i = worstEndIndex + 1; i < list.length; i++) {
    equityAfterDD += Number(list[i].pl) || 0;

    if (equityAfterDD >= targetPeak) {
      return i - worstEndIndex;
    }
  }

  return list.length - worstEndIndex;
}

function calculateWorstLosingStreak(list) {
  // Agrupar P/L por día — un día es ganador si su P/L neto es positivo
  const byDay = {};
  list.forEach(t => {
    if (!t.date) return;
    if (!byDay[t.date]) byDay[t.date] = 0;
    byDay[t.date] += Number(t.pl) || 0;
  });

  // Ordenar días
  const days = Object.keys(byDay).sort();

  let currentCount = 0;
  let currentLoss  = 0;
  let worstCount   = 0;
  let worstLoss    = 0;

  days.forEach(day => {
    const dayPL = byDay[day];
    if (dayPL < 0) {
      currentCount++;
      currentLoss += Math.abs(dayPL);
      if (currentCount > worstCount ||
         (currentCount === worstCount && currentLoss > worstLoss)) {
        worstCount = currentCount;
        worstLoss  = currentLoss;
      }
    } else {
      // Día ganador o break-even resetea la racha
      currentCount = 0;
      currentLoss  = 0;
    }
  });

  return {
    count: worstCount,
    loss: worstLoss
  };
}



// personalNotes se carga desde Supabase en loadNotesFromSupabase()

function initPersonalNotes() {
  const noteDate = document.getElementById("noteDate");
  const noteText = document.getElementById("personalNoteText");

  if (!noteDate || !noteText) return;

  const today = new Date().toISOString().slice(0, 10);
  noteDate.value = today;
  noteText.value = personalNotes[today] || "";

  noteDate.addEventListener("change", function() {
    noteText.value = personalNotes[noteDate.value] || "";
  });

  document.getElementById("savePersonalNote")?.addEventListener("click", async function() {
    const date = noteDate.value;
    const text = noteText.value.trim();

    if (!date) {
      showToast('⚠️ Fecha requerida', 'Selecciona una fecha en el calendario primero.');
      return;
    }

    if (!text) {
      showToast('⚠️ Nota vacía', 'Escribe algo antes de guardar.');
      return;
    }

    personalNotes[date] = text;
    await saveNoteToSupabase(date, text);
    renderNotesCalendar();
    showToast('✅ Nota guardada', 'La nota fue guardada correctamente.');
  });

  document.getElementById("deletePersonalNote")?.addEventListener("click", async function() {
    const date = noteDate.value;

    if (!personalNotes[date]) {
      showToast('⚠️ Sin nota', 'No hay ninguna nota guardada para esa fecha.');
      return;
    }

    const ok = confirm("¿Borrar la nota de este día?");
    if (!ok) return;

    delete personalNotes[date];
    await deleteNoteFromSupabase(date);
    noteText.value = "";
    renderNotesCalendar();
    showToast('🗑️ Nota borrada', 'La nota fue eliminada.');
  });

  renderNotesCalendar();
}

function renderNotesCalendar() {
  const calendar = document.getElementById("notesCalendar");
  const noteDate = document.getElementById("noteDate");
  const noteText = document.getElementById("personalNoteText");

  if (!calendar) return;

  const dates = Object.keys(personalNotes).sort().reverse();

  if (!dates.length) {
    calendar.innerHTML = `<p class="muted">No hay notas guardadas todavía.</p>`;
    return;
  }

  calendar.innerHTML = dates.map(date => {
    const preview = personalNotes[date].slice(0, 90);
    return `
      <div class="note-day" onclick="openPersonalNote('${date}')">
        <strong>${date}</strong>
        <div class="note-preview">${preview}${personalNotes[date].length > 90 ? "..." : ""}</div>
      </div>
    `;
  }).join("");
}

function openPersonalNote(date) {
  const noteDate = document.getElementById("noteDate");
  const noteText = document.getElementById("personalNoteText");

  if (!noteDate || !noteText) return;

  noteDate.value = date;
  noteText.value = personalNotes[date] || "";
}

initPersonalNotes();

function renderSetupQualityScore(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);

  const container = document.getElementById("setupRanking");

  if (!container) return;

  if (!trades.length) {
    container.innerHTML = "<p>No hay datos.</p>";
    return;
  }

  const setups = {};

  trades.forEach(t => {

    const setup = t.setup || "Sin Setup";

    if (!setups[setup]) {
      setups[setup] = [];
    }

    setups[setup].push(t);

  });

  const ranking = [];

  Object.keys(setups).forEach(name => {

    const sTrades = setups[name];

    const wins = sTrades.filter(t => t.pl > 0);
    const losses = sTrades.filter(t => t.pl < 0);

    const grossWin =
      wins.reduce((a,b)=>a+(Number(b.pl)||0),0);

    const grossLoss =
      Math.abs(losses.reduce((a,b)=>a+(Number(b.pl)||0),0));

    const net =
      sTrades.reduce((a,b)=>a+(Number(b.pl)||0),0);

    const winRate =
      sTrades.length
      ? (wins.length/sTrades.length)*100
      : 0;

    const pf =
      grossLoss > 0
      ? grossWin/grossLoss
      : grossWin > 0 ? 999 : 0;

    let score = 0;

    score += Math.min(winRate/10,4);

    score += Math.min(pf,4);

    if(net > 0)
      score += 2;

    score = Math.min(score,10);

    ranking.push({
      name,
      trades:sTrades.length,
      pf,
      winRate,
      net,
      score
    });

  });

  ranking.sort((a,b)=>b.score-a.score);

  const totalPL =
    trades.reduce((a,b)=>a+(Number(b.pl)||0),0);

  container.innerHTML = ranking.map((s,i)=>`

    <div class="setup-card">

      <h3>
        #${i+1} ${s.name}
      </h3>

      <div class="setup-grid">

        <div class="setup-metric">
          <span>Score</span>
          <strong style="color:${s.score >= 7 ? 'var(--green)' : s.score >= 5 ? 'var(--gold)' : 'var(--red)'}">${s.score.toFixed(1)}/10</strong>
        </div>

        <div class="setup-metric">
          <span>Trades</span>
          <strong style="color:var(--accent)">${s.trades}</strong>
        </div>

        <div class="setup-metric">
          <span>Win Rate</span>
          <strong style="color:${s.winRate >= 55 ? 'var(--green)' : s.winRate >= 45 ? 'var(--gold)' : 'var(--red)'}">${s.winRate.toFixed(1)}%</strong>
        </div>

        <div class="setup-metric">
          <span>Profit Factor</span>
          <strong style="color:${s.pf >= 1.5 ? 'var(--green)' : s.pf >= 1 ? 'var(--gold)' : 'var(--red)'}">${s.pf === 999 ? '∞' : s.pf.toFixed(2)}</strong>
        </div>

        <div class="setup-metric">
          <span>Contribución</span>
          <strong style="color:var(--text)">${totalPL !== 0 ? ((s.net/totalPL)*100).toFixed(1) : 0}%</strong>
        </div>

      </div>

    </div>

  `).join("");

}



function renderSystemDriftMonitor(activeTrades) {
  const trades = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  if (!document.getElementById("driftScore")) return;

  const total = trades.length;

  if (total < 30) {
    setText("driftScore", "N/A");
    setText("driftStatus", "🟡 Necesita 30+ trades");
    setText("driftHistExpectancy", "$0.00");
    setText("driftRecentExpectancy", "$0.00");
    setText("driftRecentWinRate", "0%");
    setText("driftComment", "Aún no hay suficiente muestra para comparar comportamiento reciente.");
    return;
  }

  const ordered = [...trades].sort((a,b) => {
    const da = new Date(`${a.date}T${a.time || "00:00"}`);
    const db = new Date(`${b.date}T${b.time || "00:00"}`);
    return da - db;
  });

  const recent = ordered.slice(-20);

  const historicalPL = sum(ordered, "pl");
  const recentPL = sum(recent, "pl");

  const histExpectancy = historicalPL / ordered.length;
  const recentExpectancy = recentPL / recent.length;

  const histWins = ordered.filter(t => t.pl > 0).length;
  const recentWins = recent.filter(t => t.pl > 0).length;

  const histWinRate = histWins / ordered.length;
  const recentWinRate = recentWins / recent.length;

  const histPlanRate = ordered.filter(t => t.insidePlan).length / ordered.length;
  const recentPlanRate = recent.filter(t => t.insidePlan).length / recent.length;

  let score = 100;

  // Penaliza caída de expectancy
  if (histExpectancy > 0) {
    const expDrop = (histExpectancy - recentExpectancy) / histExpectancy;
    if (expDrop > 0) score -= Math.min(expDrop * 40, 40);
  }

  // Penaliza caída de winrate
  const wrDrop = histWinRate - recentWinRate;
  if (wrDrop > 0) score -= Math.min(wrDrop * 100, 25);

  // Penaliza pérdida de disciplina reciente
  const planDrop = histPlanRate - recentPlanRate;
  if (planDrop > 0) score -= Math.min(planDrop * 100, 25);

  // Penaliza si los últimos 20 están negativos
  if (recentPL < 0) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let status = "🟢 Sistema alineado";
  let comment = "El comportamiento reciente está alineado con el historial.";

  if (score < 85) {
    status = "🟡 Ligera desviación";
    comment = "Hay deterioro moderado en los últimos 20 trades.";
  }

  if (score < 70) {
    status = "🟠 Atención";
    comment = "El comportamiento reciente se está alejando del perfil histórico.";
  }

  if (score < 55) {
    status = "🔴 Drift alto";
    comment = "Los últimos 20 trades muestran deterioro fuerte. Revisar ejecución o condiciones.";
  }

  setText("driftScore", score.toFixed(0) + "/100");
  setText("driftStatus", status);
  setText("driftHistExpectancy", money(histExpectancy));
  setText("driftRecentExpectancy", money(recentExpectancy));
  setText("driftRecentWinRate", (recentWinRate * 100).toFixed(1) + "%");
  setText("driftComment", comment);
}

/* ============================================================
   MONTE CARLO
   ============================================================ */
function renderMonteCarloPanel(activeTrades) {
  const list = Array.isArray(activeTrades) ? activeTrades : (Array.isArray(window.trades) ? window.trades : []);
  const empty   = document.getElementById("mcEmptyState");
  const results = document.getElementById("mcResults");
  const btn     = document.getElementById("runMonteCarloBtn");
  const countEl = document.getElementById("mcTradeCount");
  if (!empty || !results || !btn) return;

  if (countEl) countEl.textContent = list.length + " trades en el historial";

  if (list.length < 10) {
    empty.style.display = "";
    results.style.display = "none";
    btn.disabled = true;
  } else {
    empty.style.display = "none";
    btn.disabled = false;
  }
}

function runMonteCarlo() {
  let list = getSourceFilteredTrades(trades);
  if (equityFilterStart || equityFilterEnd) {
    list = getEquityFilteredTrades();
  }
  const pnls = list.map(t => Number(t.pl) || 0);
  const n = pnls.length;
  if (n < 10) return;

  const N_SIMS = 2000;
  const finals = [];
  const drawdowns = [];
  const curves = [];

  for (let s = 0; s < N_SIMS; s++) {
    let equity = 0, peak = 0, maxDD = 0;
    const curve = [0];
    for (let i = 0; i < n; i++) {
      const p = pnls[Math.floor(Math.random() * n)];
      equity += p;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
      curve.push(equity);
    }
    finals.push(equity);
    drawdowns.push(maxDD);
    curves.push(curve);
  }

  finals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);

  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];

  const medianFinal = pct(finals, 0.50);
  const p5Final  = pct(finals, 0.05);
  const p95Final = pct(finals, 0.95);
  const medianDD = pct(drawdowns, 0.50);
  const dd95     = pct(drawdowns, 0.95);
  const probLoss = finals.filter(f => f < 0).length / N_SIMS * 100;

  const realDD = calculateMaxDrawdown(list);

  // Bandas de percentiles para el "fan chart"
  const bandP5 = [], bandP25 = [], bandP50 = [], bandP75 = [], bandP95 = [];
  for (let step = 0; step <= n; step++) {
    const vals = curves.map(c => c[step]).sort((a, b) => a - b);
    bandP5.push(pct(vals, 0.05));
    bandP25.push(pct(vals, 0.25));
    bandP50.push(pct(vals, 0.50));
    bandP75.push(pct(vals, 0.75));
    bandP95.push(pct(vals, 0.95));
  }

  setText("mcMedianEquity", money(medianFinal));
  setText("mcEquityRange", money(p5Final) + " a " + money(p95Final));
  setText("mcProbLoss", probLoss.toFixed(1) + "%");
  setText("mcMedianDD", money(medianDD));
  setText("mcDD95", money(dd95));

  let conclusion = `Si tu sistema mantiene el mismo comportamiento, en una racha de ${n} operaciones más es probable terminar entre ${money(p5Final)} y ${money(p95Final)} (mediana ${money(medianFinal)}). `;
  conclusion += `Hay un ${probLoss.toFixed(1)}% de probabilidad de que esa próxima racha cierre en pérdida neta. `;
  if (dd95 > realDD * 1.3) {
    conclusion += `Tu drawdown histórico (${money(realDD)}) podría no ser tu peor escenario: en el 5% de los casos más adversos, el drawdown proyectado llega a ${money(dd95)}. Dimensiona tu cuenta pensando en ese número, no solo en el histórico.`;
  } else {
    conclusion += `Tu drawdown histórico (${money(realDD)}) está en línea con lo que muestra la simulación — buena señal de consistencia.`;
  }
  setText("mcConclusion", conclusion);

  document.getElementById("mcResults").style.display = "";

  const ctx = document.getElementById("monteCarloChart");
  if (monteCarloChart) monteCarloChart.destroy();
  const labels = bandP50.map((_, i) => i);

  monteCarloChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "P5",      data: bandP5,  borderColor: "rgba(0,212,255,0.15)", backgroundColor: "transparent", fill: false, pointRadius: 0, borderWidth: 1 },
        { label: "P95",     data: bandP95, borderColor: "rgba(0,212,255,0.15)", backgroundColor: "rgba(0,212,255,0.10)", fill: 0, pointRadius: 0, borderWidth: 1 },
        { label: "P25",     data: bandP25, borderColor: "rgba(0,212,255,0.25)", backgroundColor: "transparent", fill: false, pointRadius: 0, borderWidth: 1 },
        { label: "P75",     data: bandP75, borderColor: "rgba(0,212,255,0.25)", backgroundColor: "rgba(0,212,255,0.20)", fill: 2, pointRadius: 0, borderWidth: 1 },
        { label: "Mediana", data: bandP50, borderColor: "#00d4ff", backgroundColor: "transparent", fill: false, pointRadius: 0, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "white", font: { size: 13 }, filter: item => item.text === "Mediana" } },
        title: { display: true, text: `Proyección Monte Carlo — próximas ${n} operaciones (P&L acumulado simulado)`, color: "#cbd5e1", font: { size: 14 } },
        tooltip: {
          filter: item => item.dataset.label === "Mediana" || item.dataset.label === "P5" || item.dataset.label === "P95",
          callbacks: { label: ctx => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Operación #", color: "#cbd5e1", font: { size: 13 } },
          ticks: { color: "#cbd5e1", font: { size: 12 }, maxTicksLimit: 12, autoSkip: true },
          grid: { color: "rgba(255,255,255,.08)" }
        },
        y: {
          title: { display: true, text: "P&L acumulado (USD)", color: "#cbd5e1", font: { size: 13 } },
          ticks: { color: "#cbd5e1", font: { size: 12 }, callback: value => money(value) },
          grid: { color: "rgba(255,255,255,.08)" }
        }
      }
    }
  });
}


let equityFilterStart = localStorage.getItem("dygpro_filter_start") || null;
let equityFilterEnd   = localStorage.getItem("dygpro_filter_end")   || null;

function getEquityFilteredTrades() {
  let list = [...trades];

  // Apply source filter
  list = getSourceFilteredTrades(list);

  if (equityFilterStart) {
    list = list.filter(t => t.date >= equityFilterStart);
  }

  if (equityFilterEnd) {
    list = list.filter(t => t.date <= equityFilterEnd);
  }

  return list.sort((a,b) => {
    const da = new Date(`${a.date}T${a.time || "00:00"}`);
    const db = new Date(`${b.date}T${b.time || "00:00"}`);
    return da - db;
  });
}

const originalRenderChartForFilter = renderChart;

renderChart = function() {
  const ctx = document.getElementById("equityChart");
  if (!ctx || typeof Chart === "undefined") return;

  const filteredTrades = getEquityFilteredTrades();

  const labels = filteredTrades.map((t, i) => `${i + 1} · ${t.date}`);
  let real = [];
  let plan = [];
  let bad = [];

  let realCum = 0;
  let planCum = 0;
  let badCum = 0;

  filteredTrades.forEach(t => {
    realCum += Number(t.pl) || 0;

    if (t.insidePlan) {
      planCum += Number(t.pl) || 0;
    }

    if (!t.insidePlan) {
      badCum += Number(t.pl) || 0;
    }

    real.push(realCum);
    plan.push(planCum);
    bad.push(badCum);
  });

  if (equityChart) equityChart.destroy();

  equityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Equity Real",
          data: real,
          borderWidth: 3,
          tension: 0.35
        },
        {
          label: "Equity Dentro del Plan",
          data: plan,
          borderWidth: 3,
          tension: 0.35
        },
        {
          label: "Equity Fuera del Plan",
          data: bad,
          borderWidth: 3,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "white"
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": $" + Number(context.raw || 0).toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(255,255,255,.08)" }
        },
        y: {
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(255,255,255,.08)" }
        }
      }
    }
  });
};

function initEquityCurveControls() {
  const applyBtn = document.getElementById("applyEquityFilter");
  const resetBtn = document.getElementById("resetEquityFilter");

  if (!applyBtn || !resetBtn) return;

  applyBtn.addEventListener("click", function() {
    equityFilterStart = document.getElementById("equityStartDate").value || null;
    equityFilterEnd = document.getElementById("equityEndDate").value || null;
    localStorage.setItem("dygpro_filter_start", equityFilterStart || "");
    localStorage.setItem("dygpro_filter_end", equityFilterEnd || "");
    render();
    renderChart();
  });

  resetBtn.addEventListener("click", function() {
    equityFilterStart = null;
    equityFilterEnd = null;
    localStorage.removeItem("dygpro_filter_start");
    localStorage.removeItem("dygpro_filter_end");
    document.getElementById("equityStartDate").value = "";
    document.getElementById("equityEndDate").value = "";
    render();

    renderChart();
  });
}

initEquityCurveControls();
renderChart();

// Equity Curve Pro Tooltip Upgrade
renderChart = function() {
  const ctx = document.getElementById("equityChart");
  if (!ctx || typeof Chart === "undefined") return;

  const filteredTrades = getEquityFilteredTrades();

  const labels = filteredTrades.map((t, i) => `Trade ${i + 1}`);
  let real = [];
  let plan = [];
  let bad = [];

  let realCum = 0;
  let planCum = 0;
  let badCum = 0;

  filteredTrades.forEach(t => {
    const pl = Number(t.pl) || 0;

    realCum += pl;
    if (t.insidePlan) planCum += pl;
    if (!t.insidePlan) badCum += pl;

    real.push(realCum);
    plan.push(planCum);
    bad.push(badCum);
  });

  if (equityChart) equityChart.destroy();

  // Fix high-DPI / retina quality
  const dpr = window.devicePixelRatio || 1;
  ctx.width  = ctx.offsetWidth  * dpr;
  ctx.height = ctx.offsetHeight * dpr;

  equityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Equity Real",
          data: real,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.08)",
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointHitRadius: 12,
          pointBackgroundColor: "#38bdf8",
          fill: true
        },
        {
          label: "Dentro del Plan",
          data: plan,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.06)",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 10,
          pointBackgroundColor: "#22c55e",
          fill: true
        },
        {
          label: "Fuera del Plan",
          data: bad,
          borderColor: "#f43f5e",
          backgroundColor: "rgba(244,63,94,0.06)",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointHitRadius: 10,
          pointBackgroundColor: "#f43f5e",
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      devicePixelRatio: dpr,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: {
            color: "#94a3b8",
            font: { size: 12 },
            boxWidth: 14, boxHeight: 2, padding: 16
          }
        },
        zoom: {
          pan: {
            enabled: window.innerWidth > 768,
            mode: 'x'
          },
          zoom: {
            wheel: { enabled: true, modifierKey: 'ctrl' },
            pinch: { enabled: false },
            mode: 'x'
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: "#0c1322",
          titleColor: "#38bdf8",
          bodyColor: "#f0f4fc",
          borderColor: "rgba(56,189,248,0.3)",
          borderWidth: 1,
          padding: 8,
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              const t = filteredTrades[index];
              return `#${index + 1} · ${t ? t.date : ""}`;
            },
            label: function(context) {
              if (context.datasetIndex !== 0) return null;
              const index = context[0]?.dataIndex ?? context.dataIndex;
              const t = filteredTrades[index];
              if (!t) return ` ${money(context.raw)}`;
              return [
                ` Equity: ${money(context.raw)}`,
                ` ${t.symbol} ${t.direction} | ${money(t.pl)}`,
                ` ${t.insidePlan ? "✅ Plan" : "❌ Fuera"}`
              ];
            },
            afterBody: function() { return []; }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { size: 11 }, maxTicksLimit: 12 },
          grid: { color: "rgba(255,255,255,0.04)" }
        },
        y: {
          ticks: {
            color: "#64748b", font: { size: 11 },
            callback: val => "$" + Number(val).toLocaleString()
          },
          grid: { color: "rgba(255,255,255,0.04)" }
        }
      }
    }
  });
};

renderChart();

// PERSONAL NOTES CALENDAR PRO - RESTORE
let notesVisibleMonth = new Date().toISOString().slice(0, 7);

function initPersonalNotesProRestore() {
  const noteDate = document.getElementById("noteDate");
  const noteText = document.getElementById("personalNoteText");
  const monthInput = document.getElementById("notesMonth");

  if (!noteDate || !noteText || !monthInput) return;

  const today = new Date().toISOString().slice(0, 10);

  noteDate.value = noteDate.value || today;
  notesVisibleMonth = noteDate.value.slice(0, 7);
  monthInput.value = notesVisibleMonth;
  noteText.value = personalNotes[noteDate.value] || "";

  noteDate.onchange = function() {
    notesVisibleMonth = noteDate.value.slice(0, 7);
    monthInput.value = notesVisibleMonth;
    noteText.value = personalNotes[noteDate.value] || "";
    renderNotesCalendarProRestore();
  };

  monthInput.onchange = function() {
    notesVisibleMonth = monthInput.value;
    renderNotesCalendarProRestore();
  };

  document.getElementById("prevNotesMonth").onclick = function() {
    notesVisibleMonth = shiftMonthRestore(notesVisibleMonth, -1);
    monthInput.value = notesVisibleMonth;
    renderNotesCalendarProRestore();
  };

  document.getElementById("nextNotesMonth").onclick = function() {
    notesVisibleMonth = shiftMonthRestore(notesVisibleMonth, 1);
    monthInput.value = notesVisibleMonth;
    renderNotesCalendarProRestore();
  };

  document.getElementById("savePersonalNote").onclick = async function() {
    const date = noteDate.value;
    const text = noteText.value.trim();

    if (!date) {
      showToast('⚠️ Fecha requerida', 'Selecciona una fecha en el calendario primero.');
      return;
    }

    if (!text) {
      showToast('⚠️ Nota vacía', 'Escribe algo antes de guardar.');
      return;
    }

    personalNotes[date] = text;
    await saveNoteToSupabase(date, text);
    notesVisibleMonth = date.slice(0, 7);
    monthInput.value = notesVisibleMonth;

    renderNotesCalendarProRestore();
    showToast('✅ Nota guardada', 'La nota fue guardada correctamente.');
  };

  document.getElementById("deletePersonalNote").onclick = async function() {
    const date = noteDate.value;

    if (!personalNotes[date]) {
      showToast('⚠️ Sin nota', 'No hay ninguna nota guardada para esa fecha.');
      return;
    }

    const ok = confirm("¿Borrar la nota de este día?");
    if (!ok) return;

    delete personalNotes[date];
    await deleteNoteFromSupabase(date);
    noteText.value = "";
    renderNotesCalendarProRestore();
    showToast('🗑️ Nota borrada', 'La nota fue eliminada.');
  };

  renderNotesCalendarProRestore();
}

function renderNotesCalendarProRestore() {
  const calendar = document.getElementById("notesCalendar");
  const noteDate = document.getElementById("noteDate");

  if (!calendar || !notesVisibleMonth) return;

  const [year, month] = notesVisibleMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const firstDow = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  let html = "";

  for (let i = 0; i < firstDow; i++) {
    html += `<div class="note-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${notesVisibleMonth}-${String(day).padStart(2, "0")}`;
    const hasNote = !!personalNotes[date];
    const selected = noteDate && noteDate.value === date;
    const preview = hasNote
      ? escapeHTMLRestore(personalNotes[date].slice(0, 55)) + (personalNotes[date].length > 55 ? "..." : "")
      : "";

    html += `
      <div class="note-cell ${hasNote ? "has-note" : ""} ${selected ? "selected" : ""}"
           onclick="openPersonalNoteProRestore('${date}')">
        <div class="note-day-number">${day}</div>
        ${hasNote ? `<div class="note-badge">Nota</div>` : ""}
        ${hasNote ? `<div class="note-cell-preview">${preview}</div>` : ""}
      </div>
    `;
  }

  calendar.innerHTML = html;
}

function openPersonalNoteProRestore(date) {
  const noteDate = document.getElementById("noteDate");
  const noteText = document.getElementById("personalNoteText");
  const monthInput = document.getElementById("notesMonth");

  if (!noteDate || !noteText) return;

  noteDate.value = date;
  noteText.value = personalNotes[date] || "";

  notesVisibleMonth = date.slice(0, 7);
  if (monthInput) monthInput.value = notesVisibleMonth;

  renderNotesCalendarProRestore();
}

function shiftMonthRestore(monthText, delta) {
  const [year, month] = monthText.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHTMLRestore(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initPersonalNotesProRestore();

/* =========================
   V2 - History Visible Rows Control
========================= */

(function initHistoryLimitControl() {
  function setup() {
    const tradeTable = document.getElementById("tradeTable");
    if (!tradeTable) return;

    const historyPanel = tradeTable.closest(".panel");
    const table = tradeTable.closest("table");

    if (!historyPanel || !table) return;
    if (document.getElementById("historyLimitSelect")) return;

    const controls = document.createElement("div");
    controls.className = "history-view-controls";
    controls.innerHTML = `
      <label for="historyLimitSelect">Mostrar historial:</label>
      <select id="historyLimitSelect">
        <option value="10">10 trades</option>
        <option value="20" selected>20 trades</option>
        <option value="50">50 trades</option>
        <option value="100">100 trades</option>
        <option value="all">Todos</option>
      </select>
    `;

    table.parentNode.insertBefore(controls, table);

    const wrapper = document.createElement("div");
    wrapper.className = "history-scroll-box";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    const select = document.getElementById("historyLimitSelect");

    function applyLimit() {
      const value = select.value;
      const rows = Array.from(tradeTable.querySelectorAll("tr"));

      rows.forEach((row, index) => {
        if (value === "all") {
          row.style.display = "";
        } else {
          row.style.display = index < Number(value) ? "" : "none";
        }
      });
    }

    select.addEventListener("change", applyLimit);

    const observer = new MutationObserver(applyLimit);
    observer.observe(tradeTable, { childList: true });

    applyLimit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

/* =========================
   V2 - Session Database Limit Control
========================= */

(function initSessionLimitControl() {
  function setup() {
    const sessionTable = document.getElementById("sessionTable");
    if (!sessionTable) return;

    const table = sessionTable.closest("table");
    if (!table) return;
    if (document.getElementById("sessionLimitSelect")) return;

    const controls = document.createElement("div");
    controls.className = "session-view-controls";
    controls.innerHTML = `
      <label for="sessionLimitSelect">Mostrar sesiones:</label>
      <select id="sessionLimitSelect">
        <option value="10">10 sesiones</option>
        <option value="20" selected>20 sesiones</option>
        <option value="50">50 sesiones</option>
        <option value="100">100 sesiones</option>
        <option value="all">Todas</option>
      </select>
    `;

    table.parentNode.insertBefore(controls, table);

    const wrapper = document.createElement("div");
    wrapper.className = "session-scroll-box";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    const select = document.getElementById("sessionLimitSelect");

    function applyLimit() {
      const value = select.value;
      const rows = Array.from(sessionTable.querySelectorAll("tr"));

      rows.forEach((row, index) => {
        row.style.display = value === "all" || index < Number(value) ? "" : "none";
      });
    }

    select.addEventListener("change", applyLimit);

    const observer = new MutationObserver(applyLimit);
    observer.observe(sessionTable, { childList: true });

    applyLimit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();


/* =========================
   V2 - Quick Symbol + Direction Selector
========================= */

(function initQuickMarketSelector() {
  function setup() {
    const symbol = document.getElementById("symbol");
    const direction = document.getElementById("direction");
    const form = document.getElementById("tradeForm");

    if (!symbol || !direction || !form) return;
    if (document.getElementById("quickMarket")) return;

    const symbolBox = symbol.closest("label") || symbol;
    const directionBox = direction.closest("label") || direction;

    const quick = document.createElement("label");
    quick.className = "quick-market-field";
    quick.innerHTML = `
      Mercado y Dirección
      <select id="quickMarket" required>
        <option value="">Seleccionar operación</option>
        <option value="MNQ|Long">MNQ Long</option>
        <option value="MNQ|Short">MNQ Short</option>
        <option value="NQ|Long">NQ Long</option>
        <option value="NQ|Short">NQ Short</option>
        <option value="MES|Long">MES Long</option>
        <option value="MES|Short">MES Short</option>
        <option value="ES|Long">ES Long</option>
        <option value="ES|Short">ES Short</option>
        <option value="MYM|Long">MYM Long</option>
        <option value="MYM|Short">MYM Short</option>
        <option value="YM|Long">YM Long</option>
        <option value="YM|Short">YM Short</option>
        <option value="MGC|Long">MGC Long</option>
        <option value="MGC|Short">MGC Short</option>
        <option value="GC|Long">GC Long</option>
        <option value="GC|Short">GC Short</option>
      </select>
      <small>Un solo campo para evitar seleccionar símbolo y dirección por separado.</small>
    `;

    symbolBox.parentNode.insertBefore(quick, symbolBox);

    symbolBox.classList.add("v2-hidden-field");
    directionBox.classList.add("v2-hidden-field");

    symbol.removeAttribute("required");
    direction.removeAttribute("required");

    const quickSelect = document.getElementById("quickMarket");

    function syncQuickMarket() {
      const value = quickSelect.value;
      if (!value) return;

      const parts = value.split("|");
      symbol.value = parts[0];
      direction.value = parts[1];
    }

    quickSelect.addEventListener("change", syncQuickMarket);

    form.addEventListener("submit", function () {
      syncQuickMarket();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

/* =========================
   V2 POLISH PACK - Tables show selected amount fully
========================= */

(function v2PolishTableHeights() {
  function applyPolish() {
    const configs = [
      {
        selectId: "historyLimitSelect",
        tbodyId: "tradeTable",
        wrapperClass: "history-scroll-box"
      },
      {
        selectId: "sessionLimitSelect",
        tbodyId: "sessionTable",
        wrapperClass: "session-scroll-box"
      }
    ];

    configs.forEach(cfg => {
      const select = document.getElementById(cfg.selectId);
      const tbody = document.getElementById(cfg.tbodyId);
      if (!select || !tbody) return;

      const wrapper = tbody.closest("." + cfg.wrapperClass);
      if (!wrapper) return;

      function update() {
        const value = select.value;

        if (value === "all") {
          wrapper.classList.add("v2-scroll-all");
        } else {
          wrapper.classList.remove("v2-scroll-all");
        }

        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.forEach((row, index) => {
          if (value === "all") {
            row.style.display = "";
          } else {
            row.style.display = index < Number(value) ? "" : "none";
          }
        });
      }

      select.addEventListener("change", update);

      const observer = new MutationObserver(update);
      observer.observe(tbody, { childList: true });

      update();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyPolish);
  } else {
    applyPolish();
  }
})();

/* =========================
   V2 - P/L Calendar View Selector
========================= */

(function initPLCalendarSelector() {
  function setup() {
    const calendar = document.getElementById("plCalendar");
    if (!calendar) return;
    if (document.getElementById("plCalendarView")) return;

    const controls = document.createElement("div");
    controls.className = "pl-calendar-controls";
    controls.innerHTML = `
      <label for="plCalendarView">Vista calendario:</label>
      <select id="plCalendarView">
        <option value="compact" selected>Compacta</option>
        <option value="open">Completa</option>
      </select>
    `;

    calendar.parentNode.insertBefore(controls, calendar);

    const select = document.getElementById("plCalendarView");

    function applyView() {
      calendar.classList.remove("v2-calendar-compact", "v2-calendar-open");

      if (select.value === "open") {
        calendar.classList.add("v2-calendar-open");
      } else {
        calendar.classList.add("v2-calendar-compact");
      }
    }

    select.addEventListener("change", applyView);
    applyView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

/* =========================
   V2 FIX - P/L Calendar Last N Days
========================= */

(function initPLCalendarDaysLimit() {
  function setup() {
    const calendar = document.getElementById("plCalendar");
    if (!calendar) return;

    const oldSelect = document.getElementById("plCalendarView");
    if (oldSelect) {
      const oldControls = oldSelect.closest(".pl-calendar-controls");
      if (oldControls) oldControls.remove();
    }

    if (document.getElementById("plCalendarDaysLimit")) return;

    const controls = document.createElement("div");
    controls.className = "pl-calendar-controls";
    controls.innerHTML = `
      <label for="plCalendarDaysLimit">Últimos días:</label>
      <select id="plCalendarDaysLimit">
        <option value="10">10 días</option>
        <option value="20" selected>20 días</option>
        <option value="50">50 días</option>
        <option value="100">100 días</option>
        <option value="all">Todo</option>
      </select>
    `;

    calendar.parentNode.insertBefore(controls, calendar);

    const select = document.getElementById("plCalendarDaysLimit");

    function applyLimit() {
      const value = select.value;
      const items = Array.from(calendar.children);

      if (value === "all") {
        calendar.classList.remove("v2-calendar-compact");
        calendar.classList.add("v2-calendar-open");
        items.forEach(item => item.style.display = "");
        return;
      }

      calendar.classList.remove("v2-calendar-open");
      calendar.classList.add("v2-calendar-compact");

      const limit = Number(value);
      items.forEach((item, index) => {
        item.style.display = index < limit ? "" : "none";
      });
    }

    select.addEventListener("change", applyLimit);

    const observer = new MutationObserver(applyLimit);
    observer.observe(calendar, { childList: true });

    applyLimit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

/* ============================================================
   RELOJ ANALÓGICO
   ============================================================ */
function drawClock() {
  const canvas = document.getElementById('analogClock');
  if (!canvas) return;

  // Force exact square size
  canvas.width  = 160;
  canvas.height = 160;

  const ctx = canvas.getContext('2d');
  const cx = 80, cy = 80, r = 70;
  const now = new Date();
  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();

  ctx.clearRect(0, 0, 160, 160);

  // Outer ring glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,212,255,0.15)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#06101e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,212,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hour marks
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const isMain = i % 3 === 0;
    const outer = r - 4;
    const inner = isMain ? r - 14 : r - 9;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * outer, cy - Math.cos(a) * outer);
    ctx.lineTo(cx + Math.sin(a) * inner, cy - Math.cos(a) * inner);
    ctx.strokeStyle = isMain ? 'rgba(0,212,255,0.9)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isMain ? 2 : 1;
    ctx.stroke();
  }

  ctx.lineCap = 'round';

  // Hour hand
  const ha = ((h + m / 60) * Math.PI) / 6;
  ctx.beginPath();
  ctx.moveTo(cx - Math.sin(ha) * 8, cy + Math.cos(ha) * 8);
  ctx.lineTo(cx + Math.sin(ha) * 40, cy - Math.cos(ha) * 40);
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Minute hand
  const ma = ((m + s / 60) * Math.PI) / 30;
  ctx.beginPath();
  ctx.moveTo(cx - Math.sin(ma) * 10, cy + Math.cos(ma) * 10);
  ctx.lineTo(cx + Math.sin(ma) * 56, cy - Math.cos(ma) * 56);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Second hand
  const sa = (s * Math.PI) / 30;
  ctx.beginPath();
  ctx.moveTo(cx - Math.sin(sa) * 12, cy + Math.cos(sa) * 12);
  ctx.lineTo(cx + Math.sin(sa) * 62, cy - Math.cos(sa) * 62);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#06101e';
  ctx.fill();

  // Digital time
  const dig = document.getElementById('clockDigital');
  if (dig) dig.textContent = now.toLocaleTimeString('es', { hour12: false });
}

setInterval(drawClock, 1000);
drawClock();

/* ============================================================
   ALARMAS DE DISCIPLINA
   ============================================================ */
const disciplinePhrases = [
  "La disciplina siempre gana 🏆",
  "¿Estás dentro del plan? Verifica ahora.",
  "Cabeza fría. Ejecuta el sistema.",
  "Una buena operación puede perder. Sigue el plan.",
  "No operes por emoción. Opera por sistema.",
  "¿Cumpliste las reglas de entrada?",
  "El trabajo no es ganar hoy. Es ejecutar el plan.",
  "Paciencia y disciplina — tu ventaja real.",
  "¿Esta operación cumple tu setup?",
  "Controla el riesgo. El dinero se cuida solo."
];

let intervalAlarmTimer = null;
let fixedAlarms = JSON.parse(localStorage.getItem('dygpro_alarms') || '[]');
let alarmCheckTimer = null;

function updateAlarmInterval() {
  const val = parseInt(document.getElementById('alarmInterval').value);
  clearInterval(intervalAlarmTimer);
  if (val > 0) {
    intervalAlarmTimer = setInterval(() => triggerDisciplineAlert(), val * 60 * 1000);
    showToast("✅ Intervalo activado", `Recibirás un recordatorio cada ${val} minutos.`);
  }
}

function triggerDisciplineAlert() {
  const phrase = disciplinePhrases[Math.floor(Math.random() * disciplinePhrases.length)];
  playBell();
  showToast("⚡ DYGPRO Recordatorio", phrase);
  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('DYGPRO Trading Journal', { body: phrase, icon: '' });
  }
}

function showToast(title, msg) {
  // Stack toasts — keep max 3, remove oldest if needed
  const existing = document.querySelectorAll('.discipline-toast');
  if (existing.length >= 3) existing[0].remove();

  const toast = document.createElement('div');
  toast.className = 'discipline-toast';

  // Offset vertically based on how many are already showing
  const count = document.querySelectorAll('.discipline-toast').length;
  const topOffset = 80 + count * 110;
  toast.style.top = topOffset + 'px';

  toast.innerHTML = `
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${msg}</div>
  `;
  document.body.appendChild(toast);

  // Update discipline msg on clock
  const dm = document.getElementById('disciplineMsg');
  if (dm) dm.textContent = msg;

  // Auto remove after 6 seconds
  setTimeout(() => {
    toast.remove();
    // Re-stack remaining toasts
    document.querySelectorAll('.discipline-toast').forEach((t, i) => {
      t.style.top = (80 + i * 110) + 'px';
    });
  }, 6000);
}

function addFixedAlarm() {
  const timeInput = document.getElementById('alarmFixedTime');
  const time = timeInput.value;
  if (!time) return;

  fixedAlarms.push({ time, label: `Alarma ${time}` });
  localStorage.setItem('dygpro_alarms', JSON.stringify(fixedAlarms));
  timeInput.value = '';
  renderFixedAlarms();
}

function removeFixedAlarm(index) {
  fixedAlarms.splice(index, 1);
  localStorage.setItem('dygpro_alarms', JSON.stringify(fixedAlarms));
  renderFixedAlarms();
}

function renderFixedAlarms() {
  const list = document.getElementById('fixedAlarmsList');
  if (!list) return;
  if (!fixedAlarms.length) { list.innerHTML = ''; return; }
  list.innerHTML = fixedAlarms.map((a, i) => `
    <div class="fixed-alarm-item">
      <span>⏰ ${a.time} — ${a.label}</span>
      <button onclick="removeFixedAlarm(${i})">✕</button>
    </div>
  `).join('');
}

// Check fixed alarms every 30 seconds
function checkFixedAlarms() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  fixedAlarms.forEach(a => {
    if (a.time === currentTime && !a._firedToday) {
      a._firedToday = true;
      const msgs = {
        '18:00': '🟢 Ventana de trading ABIERTA — Dom 6PM. El sistema está activo.',
        '16:00': '🔴 Ventana de trading CERRANDO — Mié 4PM. Cierra posiciones.',
      };
      showToast('⏰ Alarma', msgs[a.time] || `Alarma programada: ${a.time}`);
    }
    // Reset at midnight
    if (now.getHours() === 0 && now.getMinutes() === 0) a._firedToday = false;
  });
}

alarmCheckTimer = setInterval(checkFixedAlarms, 30000);

// Request notification permission
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission();
}

renderFixedAlarms();

/* ============================================================
   GALERÍA DE CAPTURAS — Supabase Storage
   ============================================================ */
let tradeImages = [];
let currentImageIndex = null;
const GALLERY_BUCKET = 'gallery';
const FREE_LIMIT = 20;
const PRO_LIMIT = 200;

// ── Comprimir imagen antes de subir ──
function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Cargar imágenes desde Supabase ──
async function loadGalleryFromSupabase() {
  if (!currentUser) return;
  try {
    const { data, error } = await _supabase
      .from('gallery')
      .select('*')
      .eq('user_id', activeUserId())
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    tradeImages = (data || []).map(r => ({
      id: r.id,
      path: r.path,
      url: r.url,
      note: r.note || '',
      date: r.date || '',
      uploaded: r.uploaded_at
    }));
    renderGallery();
  } catch(e) {
    console.log('Error cargando galería:', e.message);
  }
}

// ── Subir imagen ──
async function handleImageUpload(event) {
  if (!currentUser) { showToast('⚠️ Sesión requerida', 'Inicia sesión para subir imágenes.'); return; }
  if (viewingStudent) return;

  const isPro = currentUser._plan === 'pro';
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT;
  if (tradeImages.length >= limit) {
    showToast('⚠️ Límite alcanzado', `Plan ${isPro ? 'Pro' : 'gratuito'}: máximo ${limit} imágenes.`);
    return;
  }

  const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;

  showToast('⏳ Subiendo...', `Procesando ${files.length} imagen${files.length > 1 ? 'es' : ''}...`);

  let uploaded = 0;
  for (const file of files) {
    try {
      // Comprimir
      const blob = await compressImage(file);
      const ext = 'jpg';
      const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      // Subir a Storage
      const { error: upErr } = await _supabase.storage.from(GALLERY_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;

      // URL pública
      const { data: urlData } = _supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
      const url = urlData.publicUrl;

      // Guardar metadata en tabla gallery
      const dateStr = new Date().toLocaleDateString('es');
      const { error: dbErr } = await _supabase.from('gallery').insert({
        user_id: currentUser.id,
        path, url, note: '', date: dateStr,
        uploaded_at: new Date().toISOString()
      });
      if (dbErr) throw dbErr;

      uploaded++;
    } catch(e) {
      console.log('Error subiendo imagen:', e.message);
      showToast('⚠️ Error al subir', `No se pudo subir ${file.name}. Intenta de nuevo.`);
    }
  }

  if (event.target) event.target.value = '';
  if (uploaded > 0) {
    await loadGalleryFromSupabase();
    showToast('✅ Imagen guardada', `${uploaded} imagen${uploaded > 1 ? 'es subidas' : ' subida'} correctamente.`);
  }
}

// ── Render galería ──
function renderGallery() {
  const grid = document.getElementById('tradeGallery');
  if (!grid) return;
  const search = (document.getElementById('gallerySearch')?.value || '').toLowerCase();
  const filtered = tradeImages.filter(img =>
    !search || (img.note||'').toLowerCase().includes(search) || (img.date||'').includes(search)
  );
  if (!filtered.length) {
    grid.innerHTML = `<div class="gallery-empty">
      <i class="ti ti-photo-off" style="font-size:40px;display:block;margin-bottom:10px"></i>
      ${search ? 'No se encontraron capturas.' : 'Aún no hay capturas. Sube tu primer screenshot de trade.'}
    </div>`;
    return;
  }
  grid.innerHTML = filtered.map(img => `
    <div class="gallery-item" onclick="openImageModal('${img.id}')">
      <img src="${img.url}" alt="Trade capture" loading="lazy">
      <div class="gallery-item-meta">
        <div class="gallery-item-date">${img.date}</div>
        <div class="gallery-item-note">${img.note || 'Sin nota — haz clic para añadir'}</div>
      </div>
    </div>
  `).join('');
}

// ── Abrir modal ──
function openImageModal(id) {
  const idx = tradeImages.findIndex(i => String(i.id) === String(id));
  if (idx === -1) return;
  currentImageIndex = idx;
  const img = tradeImages[idx];
  const modalImg = document.getElementById('modalImg');
  modalImg.src = img.url;
  modalImg.style.transform = 'scale(1)';
  modalImg.style.cursor = 'zoom-in';
  _imgZoomLevel = 1;
  document.getElementById('modalNote').value = img.note || '';
  const modal = document.getElementById('imageModal');
  modal.classList.remove('hidden');
  modal.onclick = (e) => { if (e.target === modal) closeImageModal(); };
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
  currentImageIndex = null;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImageModal(); });

// ── Guardar nota ──
async function saveImageNote() {
  if (currentImageIndex === null || viewingStudent) return;
  const img = tradeImages[currentImageIndex];
  const note = document.getElementById('modalNote').value;
  try {
    await _supabase.from('gallery').update({ note }).eq('id', img.id).eq('user_id', currentUser.id);
    img.note = note;
    renderGallery();
    closeImageModal();
    showToast('✅ Nota guardada', 'La nota de la captura fue actualizada.');
  } catch(e) {
    showToast('⚠️ Error', 'No se pudo guardar la nota. Intenta de nuevo.');
  }
}

// ── Borrar imagen ──
async function deleteImage() {
  if (currentImageIndex === null || viewingStudent) return;
  const img = tradeImages[currentImageIndex];
  const ok = confirm('¿Eliminar esta captura?');
  if (!ok) return;
  try {
    await _supabase.storage.from(GALLERY_BUCKET).remove([img.path]);
    await _supabase.from('gallery').delete().eq('id', img.id).eq('user_id', currentUser.id);
    tradeImages.splice(currentImageIndex, 1);
    closeImageModal();
    renderGallery();
    showToast('🗑️ Imagen eliminada', 'La captura fue eliminada correctamente.');
  } catch(e) {
    showToast('⚠️ Error', 'No se pudo eliminar. Intenta de nuevo.');
  }
}

// ── Drag and drop ──
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.querySelector('.gallery-upload-area');
  if (!uploadArea) return;
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--gold)'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) handleImageUpload({ target: { files } });
  });
  renderGallery();
});

// Iniciar autenticación
initAuth();


/* ── ONBOARDING ── */
function checkOnboarding() {
  if (localStorage.getItem("dygpro_onboarding_done")) return;
  if (!currentUser) return;
  if (trades.length > 0) { localStorage.setItem("dygpro_onboarding_done","1"); return; }
  const el = document.getElementById("onboardingOverlay");
  if (el) el.style.display = "flex";
}

function onboardingAction(action) {
  const el = document.getElementById("onboardingOverlay");
  if (el) el.style.display = "none";
  localStorage.setItem("dygpro_onboarding_done","1");
  if (action === "import") {
    document.getElementById("section-data")?.scrollIntoView({behavior:"smooth"});
    showToast("📥 Importar trades","Selecciona tu archivo CSV.");
  } else if (action === "manual") {
    document.getElementById("section-entry")?.scrollIntoView({behavior:"smooth"});
    showToast("✏️ Registrar trade","Llena el formulario.");
  } else {
    showToast("👀 Explorando","Importa o registra tus trades cuando estés listo.");
  }
}

/* ============================================================
   MI PERFIL DE TRADER
   ============================================================ */
let traderProfile = {};

function loadProfile() {
  // Primero cargar desde localStorage (rápido)
  try {
    const saved = localStorage.getItem('dygpro_profile');
    if (saved) {
      traderProfile = JSON.parse(saved);
      applyProfileToUI();
    }
  } catch(e) {}

  // Luego sincronizar desde Supabase (viaja entre dispositivos)
  if (currentUser) {
    _supabase.from('profiles').select('trader_name,nickname,capital,broker,instrument,motto,photo,system_config,is_admin').eq('id', currentUser.id).single()
      .then(({ data, error }) => {
        if (error || !data) return;
        isAdmin = !!data.is_admin;
        applyAdminUI();
        traderProfile = {
          name:       data.trader_name || '',
          nickname:   data.nickname    || '',
          capital:    data.capital     || '',
          broker:     data.broker      || '',
          instrument: data.instrument  || '',
          motto:      data.motto       || '',
          photo:      data.photo       || ''
        };
        try { localStorage.setItem('dygpro_profile', JSON.stringify(traderProfile)); } catch(e) {}
        // Restaurar config del sistema desde Supabase (o por defecto si la cuenta es nueva)
        try {
          const cloudConfig = data.system_config ? JSON.parse(data.system_config) : {};
          systemConfig = { ...DEFAULT_CONFIG, ...cloudConfig };
          localStorage.setItem('dygpro_system_config', JSON.stringify(systemConfig));
        } catch(e) { console.log('Error parseando system_config:', e); }
        applyProfileToUI();
      });
  }
}

// Carga aislada del perfil/config de un estudiante (modo "viendo journal")
// No toca localStorage ni hace fallback a valores previos.
function loadProfileForViewing(studentId) {
  _supabase.from('profiles')
    .select('trader_name,nickname,capital,broker,instrument,motto,photo,system_config,is_admin')
    .eq('id', studentId).single()
    .then(({ data, error }) => {
      if (error || !data) {
        showToast('⚠️ Error', 'No se pudo cargar el perfil del estudiante.');
        return;
      }
      traderProfile = {
        name:       data.trader_name || '',
        nickname:   data.nickname    || '',
        capital:    data.capital     || '',
        broker:     data.broker      || '',
        instrument: data.instrument  || '',
        motto:      data.motto       || '',
        photo:      data.photo       || ''
      };
      systemConfig = { ...DEFAULT_CONFIG };
      if (data.system_config) {
        try {
          systemConfig = { ...DEFAULT_CONFIG, ...JSON.parse(data.system_config) };
        } catch(e) {}
      }
      applyProfileToUI();
      render();
    });
}

function saveProfile() {
  if (viewingStudent) return;
  const name       = document.getElementById('profileName')?.value.trim() || '';
  const nickname   = document.getElementById('profileNickname')?.value.trim() || '';
  const capital    = document.getElementById('profileCapital')?.value || '';
  const broker     = document.getElementById('profileBroker')?.value || '';
  const instrument = document.getElementById('profileInstrument')?.value || '';
  const motto      = document.getElementById('profileMotto')?.value.trim() || '';
  const photo      = traderProfile.photo || '';

  traderProfile = { name, nickname, capital, broker, instrument, motto, photo };

  // Guardar en localStorage inmediatamente
  try { localStorage.setItem('dygpro_profile', JSON.stringify(traderProfile)); } catch(e) {}

  // Feedback visual inmediato
  const btn = document.querySelector('button[onclick="saveProfile()"]');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Guardado';
    btn.style.background = 'var(--green)';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = 'var(--accent)';
      btn.disabled = false;
    }, 2000);
  }

  const msg = document.getElementById('profileSaveMsg');
  if (msg) { msg.style.display = 'inline'; setTimeout(() => msg.style.display = 'none', 3000); }

  applyProfileToUI();

  // Guardar en Supabase si hay sesión
  if (currentUser) {
    _supabase.from('profiles').upsert({
      id: currentUser.id,
      trader_name: name,
      nickname,
      capital: parseFloat(capital) || 0,
      broker,
      instrument,
      motto,
      photo: photo || null
    }, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) {
        console.log('Profile Supabase error:', error.message);
        showToast('⚠️ Solo guardado local', 'Los datos se guardaron en este navegador pero no en la nube.');
      } else {
        showToast('✅ Perfil guardado', name || nickname ? `Bienvenido, ${nickname || name}!` : 'Tu perfil fue actualizado y sincronizado.');
      }
    });
  } else {
    showToast('✅ Perfil guardado', 'Datos guardados en este navegador.');
  }
}

function applyProfileToUI() {
  const { name, nickname, capital, broker, instrument, motto, photo } = traderProfile;

  // Llenar formulario
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('profileName', name);
  setVal('profileNickname', nickname);
  setVal('profileCapital', capital);
  setVal('profileBroker', broker);
  setVal('profileInstrument', instrument);
  setVal('profileMotto', motto);

  const displayName = nickname || name || '';
  const initials = name ? name.slice(0,2).toUpperCase() : (displayName ? displayName.slice(0,2).toUpperCase() : 'U');

  // Avatar grande (sección perfil)
  const bigImg      = document.getElementById('profileAvatarImg');
  const bigInitials = document.getElementById('profileAvatarInitials');
  if (bigImg && bigInitials) {
    if (photo) { bigImg.src = photo; bigImg.style.display = 'block'; bigInitials.style.display = 'none'; }
    else { bigImg.style.display = 'none'; bigInitials.style.display = 'block'; bigInitials.textContent = initials; }
  }

  // Avatar top bar
  const tbImg      = document.getElementById('topbar-avatar-img');
  const tbInitials = document.getElementById('topbar-avatar-initials');
  const tbName     = document.getElementById('topbar-trader-name');
  if (tbImg && tbInitials) {
    if (photo) { tbImg.src = photo; tbImg.style.display = 'block'; tbInitials.style.display = 'none'; }
    else { tbImg.style.display = 'none'; tbInitials.style.display = 'block'; tbInitials.textContent = initials; }
  }
  if (tbName) { tbName.textContent = displayName; tbName.style.display = displayName ? 'inline' : 'none'; }

  // También actualizar el avatar original del sistema auth
  const authInitials = document.getElementById('user-avatar-initials');
  if (authInitials && !photo) authInitials.textContent = initials;

  // Franja de perfil en el dashboard (junto a Precios en Vivo)
  const dashImg      = document.getElementById('dashProfileImg');
  const dashInitials = document.getElementById('dashProfileInitials');
  const dashName     = document.getElementById('dashProfileName');
  const dashNick     = document.getElementById('dashProfileNickname');
  const dashCapital  = document.getElementById('dashProfileCapital');
  if (dashImg && dashInitials) {
    if (photo) { dashImg.src = photo; dashImg.style.display = 'block'; dashInitials.style.display = 'none'; }
    else { dashImg.style.display = 'none'; dashInitials.style.display = 'block'; dashInitials.textContent = initials; }
  }
  if (dashName) dashName.textContent = name || nickname || 'Mi Perfil';
  if (dashNick) dashNick.textContent = (nickname && name) ? `"${nickname}"` : '';
  if (dashCapital) dashCapital.textContent = capital ? `💰 $${Number(capital).toLocaleString()}` : '';

  // Preview card
  const card = document.getElementById('profilePreviewCard');
  if (card && (name || nickname || capital || broker)) {
    card.style.display = 'block';
    const pvImg      = document.getElementById('previewImg');
    const pvInitials = document.getElementById('previewInitials');
    if (pvImg && pvInitials) {
      if (photo) { pvImg.src = photo; pvImg.style.display = 'block'; pvInitials.style.display = 'none'; }
      else { pvImg.style.display = 'none'; pvInitials.style.display = 'block'; pvInitials.textContent = initials; }
    }
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('previewName',       name || nickname || '—');
    el('previewNickname',   nickname ? `"${nickname}"` : '');
    el('previewCapital',    capital  ? `💰 $${Number(capital).toLocaleString()}` : '');
    el('previewBroker',     broker   ? `📊 ${broker}` : '');
    el('previewInstrument', instrument ? `⚡ ${instrument}` : '');
    el('previewMotto',      motto ? `"${motto}"` : '');
  }
}

function handleProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('⚠️ Imagen muy grande', 'Máximo 2MB para foto de perfil.'); return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    traderProfile.photo = e.target.result;
    applyProfileToUI();
    showToast('📷 Foto cargada', 'Presiona Guardar Perfil para confirmar.');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// Cargar perfil al iniciar
document.addEventListener('DOMContentLoaded', () => { loadProfile(); });

// Cargar perfil también después del login
const __origShowApp = showApp;
showApp = function() {
  __origShowApp();
  setTimeout(loadProfile, 600);
};

/* ── Ajustar sidebar según banner ── */
function adjustSidebarForBanner() {
  const banner = document.getElementById('upgrade-banner');
  const sidebar = document.getElementById('sidebar');
  const showBtn = document.getElementById('btn-show-sidebar');
  if (!banner || !sidebar) return;
  const bannerVisible = banner.style.display !== 'none';
  const bannerH = bannerVisible ? banner.offsetHeight : 0;
  const topBarH = 64;
  const total = topBarH + bannerH;
  sidebar.style.top = total + 'px';
  sidebar.style.height = 'calc(100vh - ' + total + 'px)';
  if (showBtn) { showBtn.style.top = (total + 6) + 'px'; }
}

const _origUpdatePlanUI = updatePlanUI;
updatePlanUI = function() {
  _origUpdatePlanUI();
  setTimeout(adjustSidebarForBanner, 100);
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(adjustSidebarForBanner, 500);
});

/* ── Fix gráfico en mobile ── */
window.addEventListener('resize', () => {
  if (window.equityChartInstance) {
    window.equityChartInstance.resize();
  }
});

/* ── Cerrar tooltip del gráfico al hacer clic fuera ── */
document.addEventListener('click', function(e) {
  const canvas = document.getElementById('equityChart');
  if (canvas && !canvas.contains(e.target)) {
    if (window.equityChart && window.equityChart.tooltip) {
      window.equityChart.tooltip.setActiveElements([], {x: 0, y: 0});
      window.equityChart.update();
    }
  }
});

/* ============================================================
   PRECIOS EN VIVO — Yahoo Finance via proxy CORS
   ============================================================ */
const LIVE_SYMBOLS = [
  { symbol: 'MNQ=F',  label: 'MNQ',      desc: 'Micro Nasdaq' },
  { symbol: 'MYM=F',  label: 'MYM',      desc: 'Micro Dow' },
  { symbol: 'NQ=F',   label: 'NQ',       desc: 'Nasdaq Full' },
  { symbol: 'ES=F',   label: 'MES',      desc: 'Micro S&P' },
  { symbol: 'MGC=F',  label: 'MGC',      desc: 'Micro Gold' },
  { symbol: 'SPY',    label: 'SPY',      desc: 'S&P 500 ETF' },
  { symbol: 'QQQ',    label: 'QQQ',      desc: 'Nasdaq ETF' },
];

async function fetchLivePrices() {
  const grid = document.getElementById('live-prices-grid');
  const status = document.getElementById('yahoo-update-time');
  if (!grid) return;

  const symbolList = LIVE_SYMBOLS.map(s => s.symbol).join(',');
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

  // Intentar múltiples proxies CORS en orden
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`
  ];

  let quotes = null;

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      // corsproxy.io devuelve directo, allorigins devuelve {contents: "..."}
      const parsed = data.contents ? JSON.parse(data.contents) : data;
      quotes = parsed?.quoteResponse?.result;
      if (quotes && quotes.length > 0) break;
    } catch(e) { continue; }
  }

  if (!quotes || quotes.length === 0) {
    if (status) status.textContent = 'Sin datos';
    if (grid) grid.innerHTML = '<div style="color:var(--text2);font-size:12px;padding:8px;">Mercado cerrado o datos no disponibles.</div>';
    return;
  }

  grid.innerHTML = '';
  LIVE_SYMBOLS.forEach(item => {
    const q = quotes.find(q => q.symbol === item.symbol);
    if (!q) return;
    const price  = q.regularMarketPrice?.toFixed(2) || '—';
    const change = q.regularMarketChange?.toFixed(2) || '0';
    const pct    = q.regularMarketChangePercent?.toFixed(2) || '0';
    const up     = parseFloat(change) >= 0;
    const color  = up ? '#22c55e' : '#f43f5e';
    const arrow  = up ? '▲' : '▼';

    grid.innerHTML += `
      <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px;">${item.label} · ${item.desc}</div>
        <div style="font-size:17px;font-weight:700;color:var(--text);letter-spacing:-.3px;">${Number(price).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        <div style="font-size:11px;color:${color};margin-top:3px;">${arrow} ${Math.abs(change)} <span style="color:var(--text2)">(${Math.abs(pct)}%)</span></div>
      </div>`;
  });

  const now = new Date().toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  if (status) status.textContent = `15min delay · ${now}`;
}

// Cargar al iniciar y cada 60 segundos
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(fetchLivePrices, 1500);
  setInterval(fetchLivePrices, 60000);
});


/* ── Buscador de símbolo con precio real ── */
function searchTVSymbol() {
  const input = document.getElementById('tvSymbolInput');
  const result = document.getElementById('tv-symbol-result');
  if (!input || !result) return;

  let raw = input.value.trim().toUpperCase();
  if (!raw) return;

  const knownMap = {
    'AAPL':'NASDAQ:AAPL','MSFT':'NASDAQ:MSFT','NVDA':'NASDAQ:NVDA',
    'TSLA':'NASDAQ:TSLA','META':'NASDAQ:META','GOOGL':'NASDAQ:GOOGL',
    'AMZN':'NASDAQ:AMZN','NFLX':'NASDAQ:NFLX','AMD':'NASDAQ:AMD',
    'INTC':'NASDAQ:INTC','ORCL':'NYSE:ORCL','JPM':'NYSE:JPM',
    'BAC':'NYSE:BAC','V':'NYSE:V','WMT':'NYSE:WMT','DIS':'NYSE:DIS',
    'UBER':'NYSE:UBER','COIN':'NASDAQ:COIN','HOOD':'NASDAQ:HOOD',
    'SPY':'AMEX:SPY','QQQ':'NASDAQ:QQQ','IWM':'AMEX:IWM',
    'BTC':'BINANCE:BTCUSDT','ETH':'BINANCE:ETHUSDT','SOL':'BINANCE:SOLUSDT',
    'XRP':'BINANCE:XRPUSDT','ADA':'BINANCE:ADAUSDT','DOGE':'BINANCE:DOGEUSDT',
    'NDX':'NASDAQ:NDX','SPX':'SP:SPX','DJI':'DJ:DJI',
    'GOLD':'TVC:GOLD','SILVER':'TVC:SILVER','OIL':'TVC:USOIL',
    'EURUSD':'FX:EURUSD','GBPUSD':'FX:GBPUSD','USDJPY':'FX:USDJPY',
    'MNQ':'CME_MINI:MNQ1!','NQ':'CME_MINI:NQ1!','ES':'CME_MINI:ES1!',
    'MYM':'CBOT_MINI:MYM1!','YM':'CBOT:YM1!'
  };

  const symbol = (!raw.includes(':') && knownMap[raw]) ? knownMap[raw] : (!raw.includes(':') ? 'NASDAQ:' + raw : raw);
  const displayName = raw.includes(':') ? raw.split(':')[1] : raw;

  // Mostrar widget de TradingView symbol-info que carga rápido
  result.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;color:var(--text2);">Resultado para <strong style="color:var(--accent)">${displayName}</strong></span>
      <button onclick="document.getElementById('tv-symbol-result').innerHTML=''" 
        style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:16px;line-height:1;">✕</button>
    </div>
    <div class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget"></div>
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" async>
      {
        "symbol": "${symbol}",
        "width": "100%",
        "locale": "es",
        "colorTheme": "dark",
        "isTransparent": true
      }
      <\/script>
    </div>`;

  input.value = '';
}

/* ============================================================
   TIME PICKER PERSONALIZADO — clic en reloj o botón Elegir
   ============================================================ */
(function initTimePicker() {
  const _openPickers = new Set();
  const _pickerState = {};

  window.openTimePicker = function(fieldId) {
    const dropdown = document.getElementById('picker-' + fieldId);
    if (!dropdown) return;

    if (dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      _openPickers.delete(fieldId);
      return;
    }

    _openPickers.forEach(id => {
      const d = document.getElementById('picker-' + id);
      if (d) d.classList.remove('open');
    });
    _openPickers.clear();

    const input = document.getElementById(fieldId);
    const current = input ? input.value : '';
    const curH = current ? parseInt(current.split(':')[0]) : 9;
    const curM = current ? parseInt(current.split(':')[1]) : 0;
    _pickerState[fieldId] = { h: curH, m: Math.round(curM / 5) * 5 };

    const hours   = Array.from({length: 24}, (_, i) => i);
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    dropdown.innerHTML = `
      <div style="text-align:center;font-size:26px;font-family:'DM Mono',monospace;color:var(--accent);letter-spacing:2px;margin-bottom:12px" id="tp-preview-${fieldId}">
        ${String(curH).padStart(2,'0')}:${String(Math.round(curM/5)*5).padStart(2,'0')}
      </div>
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;text-align:center;margin-bottom:6px">Hora</div>
          <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:3px" id="tp-hours-${fieldId}">
            ${hours.map(h => `<div class="time-slot${h === curH ? ' selected' : ''}" onclick="window._tpSelectH('${fieldId}',${h})">${String(h).padStart(2,'0')}</div>`).join('')}
          </div>
        </div>
        <div style="font-size:22px;color:var(--text2);padding-top:28px">:</div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;text-align:center;margin-bottom:6px">Min</div>
          <div style="display:flex;flex-direction:column;gap:3px" id="tp-mins-${fieldId}">
            ${minutes.map(m => `<div class="time-slot${m === Math.round(curM/5)*5 ? ' selected' : ''}" onclick="window._tpSelectM('${fieldId}',${m})">${String(m).padStart(2,'0')}</div>`).join('')}
          </div>
        </div>
      </div>
      <button onclick="window._tpConfirm('${fieldId}')" style="width:100%;margin-top:12px;padding:9px;border-radius:9px;background:var(--accent);border:none;color:#000;font-weight:700;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;">✅ Confirmar</button>
    `;

    dropdown.classList.add('open');
    _openPickers.add(fieldId);

    setTimeout(() => {
      const hoursBox = document.getElementById('tp-hours-' + fieldId);
      if (hoursBox) {
        const selected = hoursBox.querySelector('.selected');
        if (selected) selected.scrollIntoView({ block: 'center' });
      }
    }, 50);
  };

  window._tpSelectH = function(fieldId, h) {
    if (!_pickerState[fieldId]) _pickerState[fieldId] = { h: 9, m: 0 };
    _pickerState[fieldId].h = h;
    document.querySelectorAll('#tp-hours-' + fieldId + ' .time-slot').forEach(el => el.classList.remove('selected'));
    const slots = document.querySelectorAll('#tp-hours-' + fieldId + ' .time-slot');
    if (slots[h]) slots[h].classList.add('selected');
    const p = document.getElementById('tp-preview-' + fieldId);
    if (p) p.textContent = String(h).padStart(2,'0') + ':' + String(_pickerState[fieldId].m).padStart(2,'0');
  };

  window._tpSelectM = function(fieldId, m) {
    if (!_pickerState[fieldId]) _pickerState[fieldId] = { h: 9, m: 0 };
    _pickerState[fieldId].m = m;
    document.querySelectorAll('#tp-mins-' + fieldId + ' .time-slot').forEach(el => el.classList.remove('selected'));
    const minutes = [0,5,10,15,20,25,30,35,40,45,50,55];
    const idx = minutes.indexOf(m);
    const slots = document.querySelectorAll('#tp-mins-' + fieldId + ' .time-slot');
    if (slots[idx]) slots[idx].classList.add('selected');
    const p = document.getElementById('tp-preview-' + fieldId);
    if (p) p.textContent = String(_pickerState[fieldId].h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  };

  window._tpConfirm = function(fieldId) {
    const state = _pickerState[fieldId];
    const input = document.getElementById(fieldId);
    if (input && state) {
      input.value = String(state.h).padStart(2,'0') + ':' + String(state.m).padStart(2,'0');
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    }
    const dropdown = document.getElementById('picker-' + fieldId);
    if (dropdown) dropdown.classList.remove('open');
    _openPickers.delete(fieldId);
  };

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.time-picker-wrap') && !e.target.closest('#analogClock')) {
      _openPickers.forEach(id => {
        const d = document.getElementById('picker-' + id);
        if (d) d.classList.remove('open');
      });
      _openPickers.clear();
    }
  });
})();

/* ============================================================
   BUZÓN DE SUGERENCIAS
   ============================================================ */
function openSuggestionModal() {
  const modal = document.getElementById('suggestionModal');
  if (modal) modal.style.display = 'flex';
}

function closeSuggestionModal() {
  const modal = document.getElementById('suggestionModal');
  if (modal) modal.style.display = 'none';
  const subj = document.getElementById('suggestionSubject');
  const msg  = document.getElementById('suggestionMessage');
  if (subj) subj.value = '';
  if (msg)  msg.value  = '';
}

async function sendSuggestion() {
  const subject = document.getElementById('suggestionSubject')?.value.trim();
  const message = document.getElementById('suggestionMessage')?.value.trim();
  const btn     = document.getElementById('suggestionSendBtn');

  if (!message) {
    showToast('⚠️ Mensaje vacío', 'Escribe tu mensaje antes de enviar.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    await _supabase.functions.invoke('send-suggestion', {
      body: {
        subject,
        message,
        userEmail: currentUser?.email || 'Anónimo'
      }
    });
    closeSuggestionModal();
    showToast('✅ Mensaje enviado', 'Gracias por tu sugerencia. Te responderemos pronto.');
  } catch(e) {
    showToast('⚠️ Error', 'No se pudo enviar. Intenta de nuevo o escribe a soporte1@dygpro.com');
  }

  btn.disabled = false;
  btn.textContent = 'Enviar mensaje';
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSuggestionModal();
});
