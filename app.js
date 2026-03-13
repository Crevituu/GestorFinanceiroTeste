/* ═══════════════════════════════════════════
   FINFLOW — app.js
═══════════════════════════════════════════ */

// ─── STATE ───────────────────────────────
const DB_KEY = 'finflow_entries';

let state = {
  entries: JSON.parse(localStorage.getItem(DB_KEY) || '[]'),
  year:  new Date().getFullYear(),
  month: new Date().getMonth(), // 0-indexed
  currentPage: 'dashboard',
  filter: 'todos',
  editingId: null,
  selectedType: 'ganho',
  selectedCat: '',
};

function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(state.entries));
}

// ─── CATEGORIES ──────────────────────────
const CATS_GANHO = ['Salário','Freelance','Investimento','Bônus','Aluguel','Venda','Outros'];
const CATS_GASTO = ['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Roupas','Assinaturas','Contas','Outros'];

// ─── FORMATTING ──────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function brl(n) {
  return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function monthLabel(y, m) {
  return `${MONTHS_PT[m]} ${y}`;
}

function entryKey(e) {
  return e.data.substring(0, 7); // "YYYY-MM"
}

// ─── SIDEBAR / DRAWER ────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── MONTH NAVIGATION ────────────────────
function prevMonth() {
  state.month--;
  if (state.month < 0) { state.month = 11; state.year--; }
  renderAll();
}
function nextMonth() {
  state.month++;
  if (state.month > 11) { state.month = 0; state.year++; }
  renderAll();
}

function updateMonthLabels() {
  const label = monthLabel(state.year, state.month);
  const sml = document.getElementById('sidebar-month-label');
  if (sml) sml.textContent = label;
  const dml = document.getElementById('desktop-month-label');
  if (dml) dml.textContent = label;
  const tm = document.getElementById('topbar-month');
  if (tm) tm.textContent = label;
  const rmb = document.getElementById('report-month-badge');
  if (rmb) rmb.textContent = label;
}

// ─── NAVIGATION ──────────────────────────
const PAGE_NAMES = {
  dashboard: 'Dashboard',
  lancamentos: 'Lançamentos',
  relatorio: 'Relatório',
  historico: 'Histórico',
};

function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  state.currentPage = page;
  closeSidebar();
  renderCurrent();
}

function renderCurrent() {
  updateMonthLabels();
  const p = state.currentPage;
  if (p === 'dashboard')   renderDashboard();
  if (p === 'lancamentos') renderLancamentos();
  if (p === 'relatorio')   renderRelatorio();
  if (p === 'historico')   renderHistorico();
  updateSidebarBalance();
}

function renderAll() {
  updateMonthLabels();
  renderDashboard();
  renderLancamentos();
  renderRelatorio();
  renderHistorico();
  updateSidebarBalance();
}

// ─── CURRENT MONTH ENTRIES ───────────────
function currentMonthEntries() {
  const key = monthKey(state.year, state.month);
  return state.entries.filter(e => e.data.startsWith(key));
}

// ─── TOTALS ──────────────────────────────
function calcTotals(entries) {
  const income  = entries.filter(e => e.tipo === 'ganho').reduce((s, e) => s + e.valor, 0);
  const expense = entries.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valor, 0);
  return { income, expense, balance: income - expense };
}

// ─── UPDATE SIDEBAR BALANCE ───────────────
function updateSidebarBalance() {
  const { balance } = calcTotals(currentMonthEntries());
  const el = document.getElementById('sidebar-balance');
  if (!el) return;
  el.textContent = brl(balance);
  el.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
}

// ─── DASHBOARD ───────────────────────────
function renderDashboard() {
  const entries = currentMonthEntries();
  const incomeEntries  = entries.filter(e => e.tipo === 'ganho');
  const expenseEntries = entries.filter(e => e.tipo === 'gasto');
  const { income, expense, balance } = calcTotals(entries);

  // Summary cards
  setText('dash-income',  brl(income));
  setText('dash-expense', brl(expense));
  setText('dash-income-count',  `${incomeEntries.length} lançamento${incomeEntries.length !== 1 ? 's' : ''}`);
  setText('dash-expense-count', `${expenseEntries.length} lançamento${expenseEntries.length !== 1 ? 's' : ''}`);

  const balEl = document.getElementById('dash-balance');
  if (balEl) {
    balEl.textContent = brl(Math.abs(balance));
    balEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
  }
  const statusEl = document.getElementById('dash-balance-status');
  if (statusEl) {
    if (!entries.length) statusEl.textContent = 'Sem movimentos';
    else if (balance > 0) statusEl.textContent = '✓ Saldo positivo';
    else if (balance < 0) statusEl.textContent = '✗ Saldo negativo';
    else statusEl.textContent = '= Zerado';
    statusEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
  }

  // Visual bars
  const maxVal = Math.max(income, expense, 1);
  setWidth('bar-income',  (income  / maxVal * 100) + '%');
  setWidth('bar-expense', (expense / maxVal * 100) + '%');
  setText('bv-income-amt',  brl(income));
  setText('bv-expense-amt', brl(expense));

  // Breakdown by description
  renderBreakdown('dash-income-detail',  incomeEntries,  'ganho');
  renderBreakdown('dash-expense-detail', expenseEntries, 'gasto');

  // Daily
  renderDailyList('dash-daily', entries);
}

function renderBreakdown(elId, entries, tipo) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!entries.length) {
    el.innerHTML = `<div class="breakdown-empty">Nenhum registro</div>`;
    return;
  }
  // Group by description
  const groups = {};
  entries.forEach(e => {
    const key = e.descricao || 'Sem descrição';
    groups[key] = (groups[key] || 0) + e.valor;
  });
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const color = tipo === 'ganho' ? 'var(--income)' : 'var(--expense)';

  el.innerHTML = sorted.map(([name, val]) => `
    <div class="breakdown-item">
      <div class="breakdown-item-dot" style="background:${color}"></div>
      <div class="breakdown-item-name" title="${name}">${name}</div>
      <div class="breakdown-item-val" style="color:${color}">${brl(val)}</div>
    </div>
  `).join('');
}

function renderDailyList(elId, entries) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!entries.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📅</div>Nenhum lançamento neste mês</div>`;
    return;
  }

  // Group by day
  const days = {};
  entries.forEach(e => {
    const d = e.data;
    if (!days[d]) days[d] = [];
    days[d].push(e);
  });

  const sortedDays = Object.keys(days).sort((a, b) => b.localeCompare(a));

  el.innerHTML = sortedDays.map(date => {
    const dayEntries = days[date];
    const dayIncome  = dayEntries.filter(e => e.tipo === 'ganho').reduce((s, e) => s + e.valor, 0);
    const dayExpense = dayEntries.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valor, 0);
    const d = new Date(date + 'T12:00:00');
    const dateLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    const groupId = 'dg-' + date.replace(/-/g, '');

    return `
      <div class="day-group">
        <div class="day-group-header" onclick="toggleDayGroup('${groupId}')">
          <span class="dgh-date">${dateLabel}</span>
          <div class="dgh-bar"><div class="dgh-bar-fill" style="width:${dayIncome > 0 ? 60 : 0}%"></div></div>
          ${dayIncome  > 0 ? `<span class="dgh-income">+${brl(dayIncome)}</span>`  : ''}
          ${dayExpense > 0 ? `<span class="dgh-expense">-${brl(dayExpense)}</span>` : ''}
        </div>
        <div class="day-group-entries" id="${groupId}">
          ${dayEntries.map(e => `
            <div class="entry-row">
              <div class="entry-type-dot" style="background:${e.tipo==='ganho'?'var(--income)':'var(--expense)'}"></div>
              <div class="entry-info">
                <div class="entry-desc">${e.descricao || '—'}</div>
                <div class="entry-cat">${e.categoria || ''}</div>
                ${e.obs ? `<div class="entry-obs">"${e.obs}"</div>` : ''}
              </div>
              <div class="entry-amount" style="color:${e.tipo==='ganho'?'var(--income)':'var(--expense)'}">
                ${e.tipo==='ganho'?'+':'-'}${brl(e.valor)}
              </div>
              <div class="entry-actions">
                <button class="entry-btn" onclick="editEntry('${e.id}')">✎</button>
                <button class="entry-btn del" onclick="deleteEntry('${e.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleDayGroup(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ─── LANÇAMENTOS ─────────────────────────
function setFilter(f, btn) {
  state.filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLancamentos();
}

function renderLancamentos() {
  const el = document.getElementById('lancamentos-list');
  if (!el) return;

  let entries = currentMonthEntries();
  if (state.filter === 'ganho') entries = entries.filter(e => e.tipo === 'ganho');
  if (state.filter === 'gasto') entries = entries.filter(e => e.tipo === 'gasto');
  entries = [...entries].sort((a, b) => b.data.localeCompare(a.data));

  if (!entries.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">💸</div>Nenhum lançamento encontrado</div>`;
    return;
  }

  el.innerHTML = entries.map(e => {
    const d = new Date(e.data + 'T12:00:00');
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <div class="entry-card">
        <div class="entry-card-type ${e.tipo}">${e.tipo === 'ganho' ? '↑' : '↓'}</div>
        <div class="entry-card-body">
          <div class="entry-card-desc">${e.descricao || '—'}</div>
          <div class="entry-card-meta">${dateStr}${e.categoria ? ' · ' + e.categoria : ''}</div>
          ${e.obs ? `<div class="entry-card-obs">${e.obs}</div>` : ''}
        </div>
        <div class="entry-card-right">
          <div class="entry-card-amount" style="color:${e.tipo==='ganho'?'var(--income)':'var(--expense)'}">
            ${e.tipo === 'ganho' ? '+' : '-'}${brl(e.valor)}
          </div>
          <div class="entry-card-btns">
            <button class="entry-btn" onclick="editEntry('${e.id}')">✎</button>
            <button class="entry-btn del" onclick="deleteEntry('${e.id}')">✕</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── RELATÓRIO ────────────────────────────
function renderRelatorio() {
  const entries = currentMonthEntries();
  const incomeEntries  = entries.filter(e => e.tipo === 'ganho');
  const expenseEntries = entries.filter(e => e.tipo === 'gasto');
  const { income, expense, balance } = calcTotals(entries);

  setText('rep-income',  brl(income));
  setText('rep-expense', brl(expense));
  const repBal = document.getElementById('rep-balance');
  if (repBal) {
    repBal.textContent = brl(balance);
    repBal.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
  }

  // Category bars — income
  renderCatBars('rep-income-cats', incomeEntries, 'ganho');
  renderCatBars('rep-expense-cats', expenseEntries, 'gasto');

  // Day by day table
  renderDayTable(entries);
}

function renderCatBars(elId, entries, tipo) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!entries.length) { el.innerHTML = `<div class="empty" style="padding:16px 0">Sem dados</div>`; return; }

  const groups = {};
  entries.forEach(e => {
    const k = e.categoria || 'Sem categoria';
    groups[k] = (groups[k] || 0) + e.valor;
  });
  const total = Object.values(groups).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const color = tipo === 'ganho' ? 'var(--income)' : 'var(--expense)';

  el.innerHTML = sorted.map(([name, val]) => {
    const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
    return `
      <div class="cat-bar-row">
        <div class="cat-bar-header">
          <span class="cat-bar-name">${name}</span>
          <span class="cat-bar-val" style="color:${color}">${brl(val)} <span style="color:var(--text-3);font-size:0.72rem">(${pct}%)</span></span>
        </div>
        <div class="cat-bar-bg">
          <div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');
}

function renderDayTable(entries) {
  const tbody = document.getElementById('rep-day-tbody');
  const tfoot = document.getElementById('rep-day-tfoot');
  if (!tbody || !tfoot) return;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:24px">Nenhum lançamento neste mês</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  // Group by day
  const days = {};
  entries.forEach(e => {
    if (!days[e.data]) days[e.data] = { income: 0, expense: 0 };
    if (e.tipo === 'ganho') days[e.data].income  += e.valor;
    else                    days[e.data].expense += e.valor;
  });

  let totalIncome = 0, totalExpense = 0;
  const rows = Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => {
    const dayBalance = vals.income - vals.expense;
    totalIncome  += vals.income;
    totalExpense += vals.expense;
    const d = new Date(date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    return `<tr>
      <td><strong>${dateStr}</strong> <span style="color:var(--text-3);font-size:0.72rem">${dayName}</span></td>
      <td style="color:var(--income)">${vals.income  > 0 ? '+' + brl(vals.income)  : '—'}</td>
      <td style="color:var(--expense)">${vals.expense > 0 ? '-' + brl(vals.expense) : '—'}</td>
      <td style="color:${dayBalance>=0?'var(--income)':'var(--expense)'};font-weight:600">${brl(dayBalance)}</td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
  const totalBal = totalIncome - totalExpense;
  tfoot.innerHTML = `<tr>
    <td><strong>Total</strong></td>
    <td style="color:var(--income)"><strong>+${brl(totalIncome)}</strong></td>
    <td style="color:var(--expense)"><strong>-${brl(totalExpense)}</strong></td>
    <td style="color:${totalBal>=0?'var(--income)':'var(--expense)'}"><strong>${brl(totalBal)}</strong></td>
  </tr>`;
}

// ─── HISTÓRICO ───────────────────────────
function renderHistorico() {
  const el = document.getElementById('historico-list');
  if (!el) return;

  // Get all unique months
  const monthMap = {};
  state.entries.forEach(e => {
    const k = e.data.substring(0, 7);
    if (!monthMap[k]) monthMap[k] = [];
    monthMap[k].push(e);
  });

  const months = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));
  if (!months.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>Nenhum histórico ainda</div>`;
    return;
  }

  el.innerHTML = months.map(k => {
    const [y, m] = k.split('-');
    const label = monthLabel(parseInt(y), parseInt(m) - 1);
    const { income, expense, balance } = calcTotals(monthMap[k]);
    return `
      <div class="month-card" onclick="jumpToMonth(${y}, ${parseInt(m)-1})">
        <div class="mc-name">${label}</div>
        <div class="mc-stats">
          <div class="mc-stat">
            <span class="mc-stat-label">Ganhos</span>
            <span style="color:var(--income);font-weight:600;font-size:0.82rem">${brl(income)}</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-label">Gastos</span>
            <span style="color:var(--expense);font-weight:600;font-size:0.82rem">${brl(expense)}</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-label">Saldo</span>
            <span class="mc-balance" style="color:${balance>=0?'var(--income)':'var(--expense)'}">${brl(balance)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function jumpToMonth(y, m) {
  state.year = parseInt(y);
  state.month = parseInt(m);
  goTo('dashboard');
}

// ─── MODAL ───────────────────────────────
function openModal(id = null) {
  state.editingId = id;
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');

  if (id) {
    const e = state.entries.find(x => x.id === id);
    if (!e) return;
    title.textContent = 'Editar Lançamento';
    setType(e.tipo);
    document.getElementById('f-valor').value = e.valor;
    document.getElementById('f-data').value  = e.data;
    document.getElementById('f-desc').value  = e.descricao || '';
    document.getElementById('f-obs').value   = e.obs || '';
    state.selectedCat = e.categoria || '';
  } else {
    title.textContent = 'Novo Lançamento';
    setType('ganho');
    document.getElementById('f-valor').value = '';
    document.getElementById('f-data').value  = new Date().toISOString().split('T')[0];
    document.getElementById('f-desc').value  = '';
    document.getElementById('f-obs').value   = '';
    state.selectedCat = '';
  }

  buildCatGrid();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function setType(type) {
  state.selectedType = type;
  const bg = document.getElementById('btn-ganho');
  const bd = document.getElementById('btn-gasto');
  bg.classList.remove('active', 'ganho-active', 'gasto-active');
  bd.classList.remove('active', 'ganho-active', 'gasto-active');
  if (type === 'ganho') {
    bg.classList.add('active', 'ganho-active');
  } else {
    bd.classList.add('active', 'gasto-active');
  }
  state.selectedCat = '';
  buildCatGrid();
}

function buildCatGrid() {
  const el = document.getElementById('cat-grid');
  if (!el) return;
  const cats = state.selectedType === 'ganho' ? CATS_GANHO : CATS_GASTO;
  const isGasto = state.selectedType === 'gasto';
  el.innerHTML = cats.map(c => `
    <div class="cat-chip ${state.selectedCat === c ? 'selected' + (isGasto ? ' gasto-cat' : '') : ''}"
         onclick="selectCat('${c}')">${c}</div>
  `).join('');
}

function selectCat(cat) {
  state.selectedCat = state.selectedCat === cat ? '' : cat;
  buildCatGrid();
}

// ─── SAVE ENTRY ──────────────────────────
function saveEntry() {
  const valor = parseFloat(document.getElementById('f-valor').value);
  const data  = document.getElementById('f-data').value;
  const desc  = document.getElementById('f-desc').value.trim();
  const obs   = document.getElementById('f-obs').value.trim();

  if (!valor || valor <= 0) { alert('Informe um valor válido!'); return; }
  if (!data) { alert('Informe a data!'); return; }

  if (state.editingId) {
    const idx = state.entries.findIndex(e => e.id === state.editingId);
    if (idx >= 0) {
      state.entries[idx] = { ...state.entries[idx], tipo: state.selectedType, valor, data, descricao: desc, categoria: state.selectedCat, obs };
    }
  } else {
    state.entries.push({
      id:        Date.now().toString() + Math.random().toString(36).slice(2, 6),
      tipo:      state.selectedType,
      valor,
      data,
      descricao: desc,
      categoria: state.selectedCat,
      obs,
      criadoEm: new Date().toISOString(),
    });
  }

  save();
  closeModal();
  renderAll();
}

// ─── EDIT / DELETE ───────────────────────
function editEntry(id) {
  openModal(id);
}

function deleteEntry(id) {
  if (!confirm('Excluir este lançamento?')) return;
  state.entries = state.entries.filter(e => e.id !== id);
  save();
  renderAll();
}

// ─── HELPERS ─────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setWidth(id, w) {
  const el = document.getElementById(id);
  if (el) el.style.width = w;
}

// ─── INIT ────────────────────────────────
function init() {
  // Set default date in modal
  const today = new Date().toISOString().split('T')[0];
  const fd = document.getElementById('f-data');
  if (fd) fd.value = today;

  renderAll();
}

init();
