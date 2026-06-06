
/* ============================================================
   SONIDO DE CAMPANA — Web Audio API
   ============================================================ */
function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

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
  'section-dashboard','section-research','section-calendar',
  'section-setup','section-drift','section-recovery',
  'section-account','section-scorecard-wrapper','section-entry',
  'section-history','section-sessions','section-notes',
  'section-data','section-gallery'
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
  // Ocultar todo
  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Mostrar solo la sección pedida
  const target = document.getElementById(sectionId);
  if (target) target.style.display = '';
  // Marcar nav activo por onclick
  document.querySelectorAll('#sidebar .nav-item').forEach(item => {
    const oc = item.getAttribute('onclick') || '';
    item.classList.toggle('active', oc.includes("'" + sectionId + "'"));
  });
  window.scrollTo(0, 0);
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

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ============================================================
   AUTH — Estado global y UI
   ============================================================ */
let currentUser = null;

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
      showApp();
    }
    if (event === "SIGNED_OUT") {
      currentUser = null;
      trades = [];
      personalNotes = {};
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
  loadTradesFromSupabase();
  loadNotesFromSupabase();
}

function showAuthOverlay() {
  document.getElementById("auth-overlay").classList.remove("hidden");
  document.getElementById("user-bar").classList.remove("visible");
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
}

/* ============================================================
   SUPABASE — Carga y guardado de trades
   ============================================================ */
async function loadTradesFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from("trades")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("date", { ascending: true });

  if (error) { console.error("Error cargando trades:", error); return; }

  trades = (data || []).map(dbRowToTrade);
  render();
}

async function loadNotesFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from("notes")
    .select("*")
    .eq("user_id", currentUser.id);

  if (error) { console.error("Error cargando notas:", error); return; }

  personalNotes = {};
  (data || []).forEach(n => { personalNotes[n.note_date] = n.content; });
  renderNotesCalendarProRestore?.();
}

async function saveTradeToSupabase(trade) {
  if (!currentUser) return;
  const { error } = await _supabase.from("trades").insert(tradeToDbRow(trade));
  if (error) console.error("Error guardando trade:", error);
}

async function deleteTradeFromSupabase(tradeId) {
  if (!currentUser || !tradeId) return;
  await _supabase.from("trades").delete().eq("id", tradeId).eq("user_id", currentUser.id);
}

async function saveNoteToSupabase(date, content) {
  if (!currentUser) return;
  const { error } = await _supabase.from("notes").upsert(
    { user_id: currentUser.id, note_date: date, content },
    { onConflict: "user_id,note_date" }
  );
  if (error) console.error("Error guardando nota:", error);
}

async function deleteNoteFromSupabase(date) {
  if (!currentUser) return;
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
let personalNotes = {};
let equityChart;

const pointValue = { MNQ: 2, NQ: 20, ES: 50, MES: 5 };
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

form.addEventListener("submit", async function(e) {
  e.preventDefault();

  const date      = val("date");
  const time      = val("time");
  const symbol    = val("symbol");
  const direction = val("direction");
  const entry     = num("entry");
  const exit      = num("exit");
  const contracts = num("contracts");
  const setup     = val("setup");
  const ruleFollowed   = val("ruleFollowed");
  const mistake        = val("mistake");
  const notes          = val("notes");
  const emotionalState = val("emotionalState");
  const lessonLearned  = val("lessonLearned");

  const sessionOpen = optionalNum("sessionOpen");
  const sessionLow  = optionalNum("sessionLow");
  const sessionHigh = optionalNum("sessionHigh");
  const peakTime    = val("peakTime");

  const points = direction === "Long" ? exit - entry : entry - exit;
  const pl     = points * pointValue[symbol] * contracts;

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

  await saveTradeToSupabase(trade);
  await loadTradesFromSupabase();
  form.reset();

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Guardar Registro"; }
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
  const d = new Date(`${date}T${time}`);
  const day = d.getDay();
  const minutes = d.getHours() * 60 + d.getMinutes();

  if (day === 0 && minutes >= 18 * 60) return true;
  if (day === 1 || day === 2) return true;
  if (day === 3 && minutes <= 16 * 60) return true;
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
  renderHistory();
  renderDashboard();
  renderChart();
  renderResearchCenter();
  renderPeakDistribution();
  renderSessionDatabase();
  renderPLCalendar();
}

function renderHistory() {
  if (!table) return;
  table.innerHTML = "";

  trades.forEach((t, index) => {
    table.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.time}</td>
        <td>${t.day}</td>
        <td>${t.symbol}</td>
        <td>${t.direction}</td>
        <td class="${t.points >= 0 ? "win" : "loss"}">${Number(t.points).toFixed(2)}</td>
        <td class="${t.pl >= 0 ? "win" : "loss"}">${money(t.pl)}</td>
        <td>${formatPts(t.pullback)}</td>
        <td>${formatPts(t.highMove)}</td>
        <td>${t.peakTime || "-"}</td>
        <td class="${t.insidePlan ? "plan-ok" : "plan-bad"}">${t.insidePlan ? "Dentro" : "Rompió"}</td>
        <td>${t.mistake || "-"}</td>
        <td><button class="delete-btn" onclick="deleteTrade(${index})">X</button></td>
      </tr>
    `;
  });
}

function renderDashboard() {
  const total = trades.length;
  const wins = trades.filter(t => t.pl > 0);
  const planTrades = trades.filter(t => t.insidePlan);
  const badTrades = trades.filter(t => !t.insidePlan);

  setText("totalPL", money(sum(trades, "pl")));
  setText("planPL", money(sum(planTrades, "pl")));
  setText("badPL", money(sum(badTrades, "pl")));
  setText("winRate", total ? (wins.length / total * 100).toFixed(1) + "%" : "0%");
  setText("disciplineRate", total ? (planTrades.length / total * 100).toFixed(1) + "%" : "0%");
  setText("maxDD", money(calculateMaxDrawdown(trades)));
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

function renderResearchCenter() {
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

function renderPeakDistribution() {
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

function renderSessionDatabase() {
  const sessionTable = document.getElementById("sessionTable");
  if (!sessionTable) return;

  sessionTable.innerHTML = "";

  trades.forEach(t => {
    sessionTable.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.day}</td>
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

function renderPLCalendar() {
  const calendar = document.getElementById("plCalendar");
  if (!calendar) return;

  calendar.innerHTML = "";

  const byDate = {};
  trades.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = 0;
    byDate[t.date] += t.pl;
  });

  const dates = Object.keys(byDate).sort();

  if (!dates.length) {
    calendar.innerHTML = `<p class="muted">No hay datos todavía para mostrar calendario.</p>`;
    return;
  }

  dates.forEach(date => {
    const pl = byDate[date];
    const cls = pl > 0 ? "cal-win" : pl < 0 ? "cal-loss" : "cal-flat";

    calendar.innerHTML += `
      <div class="cal-day ${cls}">
        <div class="cal-date">${date}</div>
        <div class="cal-pl">${money(pl)}</div>
      </div>
    `;
  });
}

async function deleteTrade(index) {
  const trade = trades[index];
  if (!trade) return;
  await deleteTradeFromSupabase(trade._id);
  await loadTradesFromSupabase();
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
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseSmartCSV(text);

    if (!rows.length) {
      alert("CSV vacío o no reconocido.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const isTV = headers.includes("tradenumber") &&
                 headers.includes("tipo") &&
                 headers.includes("fechayhora") &&
                 headers.includes("preciousd");

    let result = isTV ? importTradingViewRows(rows, file.name) : importGenericRows(rows);

    save();
    render();
    event.target.value = "";

    alert(`${isTV ? "TradingView Strategy Tester" : "CSV genérico"} importado.\nImportados: ${result.imported}\nIgnorados: ${result.skipped}`);
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

    trades.push({
      date, time, day: dayNames[d.getDay()], symbol, direction,
      entry, exit, contracts, points, pl,
      setup: "TradingView Strategy",
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

document.getElementById("csvFile")?.addEventListener("change", importCSV);
document.getElementById("exportCSV")?.addEventListener("click", function() {
  alert("Exportar CSV lo reactivamos en el próximo paso. Primero estabilizamos.");
});
document.getElementById("clearData")?.addEventListener("click", function() {
  const ok = confirm("¿Seguro que quieres borrar todos los datos?");
  if (!ok) return;
  trades = [];
  save();
  render();
});

render();

function renderDisciplineEngine() {
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

const renderBeforeDiscipline = render;

render = function() {
  renderBeforeDiscipline();
  renderDisciplineEngine();
};

render();

function renderPerformanceRatios() {
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

  setText("profitFactor", profitFactor === 999 ? "∞" : profitFactor.toFixed(2));
  setText("payoffRatio", payoffRatio === 999 ? "∞" : payoffRatio.toFixed(2));
  setText("avgWin", money(avgWinValue));
  setText("avgLoss", money(-avgLossValue));
  setText("expectancy", money(expectancy));
  setText("realRR", realRR.toFixed(2) + "R");
}

const renderBeforeRatios = render;

render = function() {
  renderBeforeRatios();
  renderPerformanceRatios();
};

render();

// Botón borrar todo
document.getElementById("clearData")?.addEventListener("click", async function() {
  const ok = confirm("¿Seguro que quieres borrar TODOS los trades? Esta acción no se puede deshacer.");
  if (!ok) return;

  trades = [];
  if (currentUser) {
    await _supabase.from("trades").delete().eq("user_id", currentUser.id);
  }
  render();
  alert("Todos los trades fueron borrados.");
});

document.getElementById("historyExportBtn")?.addEventListener("click", function() {
  document.getElementById("exportCSV")?.click();
});

document.getElementById("historyClearBtn")?.addEventListener("click", async function() {

  const ok = confirm(
    "¿Seguro que deseas borrar TODAS las operaciones?"
  );

  if (!ok) return;

  trades = [];
  if (currentUser) {
    await _supabase.from("trades").delete().eq("user_id", currentUser.id);
  }
  render();
  alert("Historial eliminado.");
});

function renderSystemScorecard() {
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

const renderBeforeSystemScorecard = render;

render = function() {
  renderBeforeSystemScorecard();
  renderSystemScorecard();
};

render();

function renderAccountSizeEngine() {
  if (!document.getElementById("accountAggressive")) return;

  if (!trades.length) {
    setText("accountAggressive", "$0.00");
    setText("accountBalanced", "$0.00");
    setText("accountConservative", "$0.00");
    setText("accountStatus", "Sin datos");
    setText("accountAdvice", "Importa operaciones para calcular capital recomendado.");
    return;
  }

  const maxDD = calculateMaxDrawdown(trades);
  const totalPL = sum(trades, "pl");
  const losses = trades.filter(t => t.pl < 0);
  const avgLoss = losses.length ? Math.abs(sum(losses, "pl")) / losses.length : 0;
  const worstLoss = losses.length ? Math.max(...losses.map(t => Math.abs(t.pl))) : 0;

  const baseRisk = Math.max(maxDD, worstLoss * 3, avgLoss * 6, 500);

  const aggressive = baseRisk * 2;
  const balanced = baseRisk * 4;
  const conservative = baseRisk * 6;

  let status = "🟡 En observación";
  let advice = "El sistema necesita más datos para una lectura fuerte.";

  if (trades.length >= 20 && totalPL > 0 && maxDD > 0) {
    status = "🟢 Capitalizable";
    advice = "El sistema muestra datos suficientes para estimar capital. La cuenta balanceada es el punto razonable.";
  }

  if (totalPL < 0) {
    status = "🔴 No escalar";
    advice = "El sistema está negativo. No aumentes tamaño hasta mejorar expectativa y drawdown.";
  }

  if (maxDD > Math.abs(totalPL) && totalPL > 0) {
    status = "🟠 Drawdown alto";
    advice = "El drawdown es grande frente a la ganancia neta. Usa cuenta conservadora o reduce contratos.";
  }

  setText("accountAggressive", money(aggressive));
  setText("accountBalanced", money(balanced));
  setText("accountConservative", money(conservative));
  setText("accountStatus", status);
  setText("accountAdvice", advice);
}

const renderBeforeAccountSize = render;

render = function() {
  renderBeforeAccountSize();
  renderAccountSizeEngine();
};

render();

function renderRecoveryAnalytics() {
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
  const ordered = [...list].sort((a, b) => {
    const da = new Date(`${a.date}T${a.time || "00:00"}`);
    const db = new Date(`${b.date}T${b.time || "00:00"}`);
    return da - db;
  });

  let currentCount = 0;
  let currentLoss = 0;

  let worstCount = 0;
  let worstLoss = 0;

  ordered.forEach(t => {
    const pl = Number(t.pl) || 0;

    if (pl < 0) {
      currentCount += 1;
      currentLoss += Math.abs(pl);

      if (
        currentCount > worstCount ||
        (currentCount === worstCount && currentLoss > worstLoss)
      ) {
        worstCount = currentCount;
        worstLoss = currentLoss;
      }
    } else if (pl > 0) {
      currentCount = 0;
      currentLoss = 0;
    }
  });

  return {
    count: worstCount,
    loss: worstLoss
  };
}

const renderBeforeRecoveryAnalytics = render;

render = function() {
  renderBeforeRecoveryAnalytics();
  renderRecoveryAnalytics();
};

render();

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
      alert("Selecciona una fecha.");
      return;
    }

    if (!text) {
      alert("La nota está vacía.");
      return;
    }

    personalNotes[date] = text;
    await saveNoteToSupabase(date, text);
    renderNotesCalendar();
    alert("Nota guardada.");
  });

  document.getElementById("deletePersonalNote")?.addEventListener("click", async function() {
    const date = noteDate.value;

    if (!personalNotes[date]) {
      alert("No hay nota para borrar en esa fecha.");
      return;
    }

    const ok = confirm("¿Borrar la nota de este día?");
    if (!ok) return;

    delete personalNotes[date];
    await deleteNoteFromSupabase(date);
    noteText.value = "";
    renderNotesCalendar();
    alert("Nota borrada.");
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

function renderSetupQualityScore() {

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
          <strong>${s.score.toFixed(1)}/10</strong>
        </div>

        <div class="setup-metric">
          <span>Trades</span>
          <strong>${s.trades}</strong>
        </div>

        <div class="setup-metric">
          <span>Win Rate</span>
          <strong>${s.winRate.toFixed(1)}%</strong>
        </div>

        <div class="setup-metric">
          <span>PF</span>
          <strong>${s.pf === 999 ? '∞' : s.pf.toFixed(2)}</strong>
        </div>

        <div class="setup-metric">
          <span>Contribución</span>
          <strong>${totalPL !== 0 ? ((s.net/totalPL)*100).toFixed(1) : 0}%</strong>
        </div>

      </div>

    </div>

  `).join("");

}

const renderBeforeSetupScore = render;

render = function() {
  renderBeforeSetupScore();
  renderSetupQualityScore();
};

render();


function renderSystemDriftMonitor() {
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

const renderBeforeDriftMonitor = render;

render = function() {
  renderBeforeDriftMonitor();
  renderSystemDriftMonitor();
};

render();

let equityFilterStart = null;
let equityFilterEnd = null;

function getEquityFilteredTrades() {
  let list = [...trades];

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
    renderChart();
  });

  resetBtn.addEventListener("click", function() {
    equityFilterStart = null;
    equityFilterEnd = null;

    document.getElementById("equityStartDate").value = "";
    document.getElementById("equityEndDate").value = "";

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
        tooltip: {
          enabled: true,
          backgroundColor: "#0c1322",
          titleColor: "#38bdf8",
          bodyColor: "#f0f4fc",
          borderColor: "rgba(56,189,248,0.3)",
          borderWidth: 1,
          padding: 14,
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              const t = filteredTrades[index];
              return `Trade #${index + 1} · ${t ? t.date : ""} ${t ? (t.time || "") : ""}`;
            },
            label: function(context) {
              return ` ${context.dataset.label}: ${money(context.raw)}`;
            },
            afterBody: function(context) {
              const index = context[0].dataIndex;
              const t = filteredTrades[index];
              if (!t) return [];
              return [
                "",
                ` ${t.symbol} ${t.direction}  |  P/L: ${money(t.pl)}`,
                ` Puntos: ${Number(t.points || 0).toFixed(2)}  |  ${t.insidePlan ? "✅ Dentro del plan" : "❌ Fuera del plan"}`
              ];
            }
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
      alert("Selecciona una fecha.");
      return;
    }

    if (!text) {
      alert("La nota está vacía.");
      return;
    }

    personalNotes[date] = text;
    await saveNoteToSupabase(date, text);
    notesVisibleMonth = date.slice(0, 7);
    monthInput.value = notesVisibleMonth;

    renderNotesCalendarProRestore();
    alert("Nota guardada.");
  };

  document.getElementById("deletePersonalNote").onclick = async function() {
    const date = noteDate.value;

    if (!personalNotes[date]) {
      alert("No hay nota para borrar en esa fecha.");
      return;
    }

    const ok = confirm("¿Borrar la nota de este día?");
    if (!ok) return;

    delete personalNotes[date];
    await deleteNoteFromSupabase(date);
    noteText.value = "";
    renderNotesCalendarProRestore();
    alert("Nota borrada.");
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
  const ctx = canvas.getContext('2d');
  const cx = 80, cy = 80, r = 72;
  const now = new Date();
  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();

  ctx.clearRect(0, 0, 160, 160);

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1220';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,212,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hour marks
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const x1 = cx + Math.sin(a) * 62, y1 = cy - Math.cos(a) * 62;
    const x2 = cx + Math.sin(a) * (i % 3 === 0 ? 52 : 57);
    const y2 = cy - Math.cos(a) * (i % 3 === 0 ? 52 : 57);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(0,212,255,0.8)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // Hour hand
  const ha = ((h + m / 60) * Math.PI) / 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ha) * 42, cy - Math.cos(ha) * 42);
  ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 3.5;
  ctx.lineCap = 'round'; ctx.stroke();

  // Minute hand
  const ma = ((m + s / 60) * Math.PI) / 30;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ma) * 58, cy - Math.cos(ma) * 58);
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2.5;
  ctx.stroke();

  // Second hand
  const sa = (s * Math.PI) / 30;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(sa) * 62, cy - Math.cos(sa) * 62);
  ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4ff'; ctx.fill();

  // Digital time
  const dig = document.getElementById('clockDigital');
  if (dig) {
    dig.textContent = now.toLocaleTimeString('es', { hour12: false });
  }
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
  // Remove existing toast
  document.querySelectorAll('.discipline-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'discipline-toast';
  toast.innerHTML = `
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${msg}</div>
  `;
  document.body.appendChild(toast);

  // Update discipline msg on clock
  const dm = document.getElementById('disciplineMsg');
  if (dm) dm.textContent = msg;

  // Auto remove after 8 seconds
  setTimeout(() => toast.remove(), 8000);
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
   GALERÍA DE CAPTURAS DE TRADES
   ============================================================ */
let tradeImages = JSON.parse(localStorage.getItem('dygpro_images') || '[]');
let currentImageIndex = null;

function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('⚠️ Imagen muy grande', 'Máximo 5MB por imagen.'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      tradeImages.unshift({
        id: Date.now() + Math.random(),
        data: e.target.result,
        note: '',
        date: new Date().toLocaleDateString('es'),
        uploaded: new Date().toISOString()
      });
      saveImages();
      renderGallery();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function saveImages() {
  try {
    localStorage.setItem('dygpro_images', JSON.stringify(tradeImages));
  } catch(e) {
    showToast('⚠️ Almacenamiento lleno', 'Elimina algunas imágenes para liberar espacio.');
  }
}

function renderGallery() {
  const grid = document.getElementById('tradeGallery');
  if (!grid) return;

  const search = document.getElementById('gallerySearch')?.value.toLowerCase() || '';
  const filtered = tradeImages.filter(img =>
    !search || img.note.toLowerCase().includes(search) || img.date.includes(search)
  );

  if (!filtered.length) {
    grid.innerHTML = `<div class="gallery-empty">
      <i class="ti ti-photo-off" style="font-size:40px;display:block;margin-bottom:10px"></i>
      ${search ? 'No se encontraron capturas.' : 'Aún no hay capturas. Sube tu primer screenshot de trade.'}
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((img, i) => `
    <div class="gallery-item" onclick="openImageModal(${tradeImages.indexOf(img)})">
      <img src="${img.data}" alt="Trade capture" loading="lazy">
      <div class="gallery-item-meta">
        <div class="gallery-item-date">${img.date}</div>
        <div class="gallery-item-note">${img.note || 'Sin nota — haz clic para añadir'}</div>
      </div>
    </div>
  `).join('');
}

function openImageModal(index) {
  currentImageIndex = index;
  const img = tradeImages[index];
  document.getElementById('modalImg').src = img.data;
  document.getElementById('modalNote').value = img.note || '';
  document.getElementById('imageModal').classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
  currentImageIndex = null;
}

function saveImageNote() {
  if (currentImageIndex === null) return;
  tradeImages[currentImageIndex].note = document.getElementById('modalNote').value;
  saveImages();
  renderGallery();
  showToast('✅ Nota guardada', 'La nota de la captura fue actualizada.');
}

function deleteImage() {
  if (currentImageIndex === null) return;
  const ok = confirm('¿Eliminar esta captura?');
  if (!ok) return;
  tradeImages.splice(currentImageIndex, 1);
  saveImages();
  closeImageModal();
  renderGallery();
}

// Drag and drop support
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.querySelector('.gallery-upload-area');
  if (!uploadArea) return;

  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--gold)';
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '';
  });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) handleImageUpload({ target: { files }, stopPropagation: ()=>{} });
  });

  renderGallery();
});
