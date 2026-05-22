// ── Firebase config ──
// Replace ALL values below with your own from the Firebase console:
// console.firebase.google.com → your project → Project settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey:            "AIzaSyAAOgTnvxOe0nN3qYckKmwCLiDUOEiMBzE",
  authDomain:        "planiq-356ba.firebaseapp.com",
  projectId:         "planiq-356ba",
  storageBucket:     "planiq-356ba.firebasestorage.app",
  messagingSenderId: "953065171505",
  appId:             "1:953065171505:web:b12746e4ded68793848310",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Constants ──
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FY_MONTHS = 12;

// Seed data for brand-new accounts
const SEED_ROWS = [
  { id: 1, role: 'Senior Engineer',  rate: 140000, type: 'yearly',  start: 1, status: 'filled',  dept: 'Engineering' },
  { id: 2, role: 'Product Manager',  rate: 110000, type: 'yearly',  start: 1, status: 'filled',  dept: 'Product' },
  { id: 3, role: 'Sales Rep',        rate: 65,     type: 'hourly',  start: 3, status: 'open',    dept: 'Sales' },
  { id: 4, role: 'Designer',         rate: 9500,   type: 'monthly', start: 6, status: 'planned', dept: 'Design' },
];

// ── State ──
let rows             = [];
let nextId           = 1;
let currentUser      = null;
let unsubFirestore   = null;

// ── Cost calculations ──
function monthlyCost(r) {
  if (r.type === 'hourly')  return Math.round(r.rate * 40 * 4.33);
  if (r.type === 'monthly') return Math.round(r.rate);
  return Math.round(r.rate / 12);
}

function annualCost(r) {
  const remaining = Math.max(0, FY_MONTHS - r.start + 1);
  return monthlyCost(r) * remaining;
}

// ── Formatting ──
function fmt(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'k';
  return '$' + n.toLocaleString();
}

// ── Summary cards ──
function updateSummary() {
  const total   = rows.length;
  const monthly = rows.reduce((a, r) => a + monthlyCost(r), 0);
  const annual  = rows.reduce((a, r) => a + annualCost(r), 0);
  const open    = rows.filter(r => r.status === 'open').length;

  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-monthly').textContent = fmt(monthly);
  document.getElementById('s-annual').textContent  = fmt(annual);
  document.getElementById('s-open').textContent    = open;
}

// ── Render headcount table ──
function render() {
  const tbody = document.getElementById('hc-body');
  tbody.innerHTML = '';

  rows.forEach(r => {
    const tr = document.createElement('tr');

    const tdRole = cell();
    tdRole.appendChild(editInput(r.role, v => updateField(r.id, 'role', v)));

    const tdRate = cell();
    const rateInput = document.createElement('input');
    rateInput.type  = 'number';
    rateInput.value = r.rate;
    rateInput.style.width = '100%';
    rateInput.addEventListener('change', e => updateField(r.id, 'rate', +e.target.value));
    tdRate.appendChild(rateInput);

    const tdType = cell();
    tdType.appendChild(selectEl(
      [['yearly','Yearly'],['monthly','Monthly'],['hourly','Hourly']],
      r.type,
      v => updateField(r.id, 'type', v)
    ));

    const tdStart = cell();
    tdStart.appendChild(selectEl(
      MONTHS.map((m, i) => [String(i + 1), m]),
      String(r.start),
      v => updateField(r.id, 'start', +v)
    ));

    const tdMonthly = cell('cost-cell');
    tdMonthly.textContent = fmt(monthlyCost(r));

    const tdAnnual = cell('cost-cell');
    tdAnnual.textContent = fmt(annualCost(r));

    const tdStatus = cell();
    tdStatus.appendChild(selectEl(
      [['filled','Filled'],['open','Open'],['planned','Planned']],
      r.status,
      v => updateField(r.id, 'status', v)
    ));

    const tdDept = cell();
    tdDept.appendChild(editInput(r.dept, v => updateField(r.id, 'dept', v)));

    const tdDel = cell();
    tdDel.style.textAlign = 'center';
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.setAttribute('aria-label', 'Delete row');
    delBtn.innerHTML = '<i class="ti ti-trash" aria-hidden="true"></i>';
    delBtn.addEventListener('click', () => deleteRow(r.id));
    tdDel.appendChild(delBtn);

    tr.append(tdRole, tdRate, tdType, tdStart, tdMonthly, tdAnnual, tdStatus, tdDept, tdDel);
    tbody.appendChild(tr);
  });

  updateSummary();
}

// ── DOM helpers ──
function cell(className) {
  const td = document.createElement('td');
  if (className) td.className = className;
  return td;
}

function editInput(value, onChange) {
  const input = document.createElement('input');
  input.type  = 'text';
  input.value = value;
  input.addEventListener('change', e => onChange(e.target.value));
  return input;
}

function selectEl(options, selected, onChange) {
  const sel = document.createElement('select');
  options.forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value       = val;
    opt.textContent = label;
    if (val === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e => onChange(e.target.value));
  return sel;
}

// ── Mutations ──
function updateField(id, field, val) {
  const r = rows.find(r => r.id === id);
  if (r) { r[field] = val; saveData(); render(); }
}

function deleteRow(id) {
  rows = rows.filter(r => r.id !== id);
  saveData();
  render();
}

function addRow() {
  rows.push({
    id:     nextId++,
    role:   'New role',
    rate:   80000,
    type:   'yearly',
    start:  1,
    status: 'planned',
    dept:   'Engineering',
  });
  saveData();
  render();
  const lastRow = document.getElementById('hc-body').lastElementChild;
  if (lastRow) lastRow.querySelector('input').focus();
}

// ── CSV export ──
function exportCSV() {
  const header  = ['Role','Rate','Type','Start Month','Monthly Cost','Annual Cost','Status','Department'];
  const rowData = rows.map(r => [
    r.role, r.rate, r.type, MONTHS[r.start - 1],
    monthlyCost(r), annualCost(r), r.status, r.dept,
  ]);

  const csv = [header, ...rowData]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'planiq-headcount.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── OpEx helpers ──
function deptMonthCost(dept, month) {
  return rows
    .filter(r => r.dept === dept && r.start <= month)
    .reduce((sum, r) => sum + monthlyCost(r), 0);
}

function uniqueDepts() {
  const seen = new Set();
  rows.forEach(r => seen.add(r.dept));
  return [...seen];
}

// ── OpEx render ──
function renderOpEx() {
  const depts       = uniqueDepts();
  const monthNums   = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthTotals = monthNums.map(m =>
    depts.reduce((sum, dept) => sum + deptMonthCost(dept, m), 0)
  );

  const annualTotal = monthTotals.reduce((a, b) => a + b, 0);
  const avgMonthly  = depts.length ? Math.round(annualTotal / 12) : 0;
  const h1          = monthTotals.slice(0, 6).reduce((a, b) => a + b, 0);
  const h2          = monthTotals.slice(6).reduce((a, b) => a + b, 0);

  document.getElementById('opex-annual').textContent = fmt(annualTotal);
  document.getElementById('opex-avg').textContent    = fmt(avgMonthly);
  document.getElementById('opex-h1').textContent     = fmt(h1);
  document.getElementById('opex-h2').textContent     = fmt(h2);

  const tbody = document.getElementById('opex-body');
  tbody.innerHTML = '';

  if (!depts.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan     = 14;
    td.textContent = 'No headcount data — add roles in the Headcount tool.';
    td.style.cssText = 'text-align:center;padding:2rem;color:var(--color-text-tertiary);font-size:13px;';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  depts.forEach(dept => {
    const tr = document.createElement('tr');

    const tdDept = document.createElement('td');
    tdDept.className   = 'opex-dept-cell';
    tdDept.textContent = dept;
    tr.appendChild(tdDept);

    let deptAnnual = 0;
    monthNums.forEach(m => {
      const cost = deptMonthCost(dept, m);
      deptAnnual += cost;
      const td = document.createElement('td');
      td.className   = 'opex-month-cell' + (cost === 0 ? ' opex-zero' : '');
      td.textContent = cost > 0 ? fmt(cost) : '—';
      tr.appendChild(td);
    });

    const tdAnnual = document.createElement('td');
    tdAnnual.className   = 'opex-month-cell opex-annual-cell';
    tdAnnual.textContent = fmt(deptAnnual);
    tr.appendChild(tdAnnual);

    tbody.appendChild(tr);
  });

  // Totals row
  const trTotals = document.createElement('tr');
  trTotals.className = 'opex-totals-row';

  const tdLabel = document.createElement('td');
  tdLabel.className   = 'opex-dept-cell';
  tdLabel.textContent = 'Total';
  trTotals.appendChild(tdLabel);

  let grandTotal = 0;
  monthNums.forEach(m => {
    const cost = monthTotals[m - 1];
    grandTotal += cost;
    const td = document.createElement('td');
    td.className   = 'opex-month-cell';
    td.textContent = fmt(cost);
    trTotals.appendChild(td);
  });

  const tdGrand = document.createElement('td');
  tdGrand.className   = 'opex-month-cell opex-annual-cell';
  tdGrand.textContent = fmt(grandTotal);
  trTotals.appendChild(tdGrand);

  tbody.appendChild(trTotals);
}

// ── Navigation ──
function switchTool(toolId) {
  document.querySelectorAll('.nav-item[data-tool]').forEach(el =>
    el.classList.toggle('active', el.dataset.tool === toolId)
  );
  document.querySelectorAll('.tool-view[id]').forEach(el => {
    el.hidden = el.id !== 'view-' + toolId;
  });
  if (toolId === 'opex') renderOpEx();
}

// ── Firestore ──
function saveData() {
  if (!currentUser) return;
  db.collection('users').doc(currentUser.uid)
    .set({ rows, nextId })
    .catch(err => console.error('Save error:', err));
}

function subscribeToData(uid) {
  if (unsubFirestore) unsubFirestore();
  unsubFirestore = db.collection('users').doc(uid).onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      rows   = d.rows   || [];
      nextId = d.nextId || rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    } else {
      // First sign-in: seed with demo data and save
      rows   = SEED_ROWS.map(r => ({ ...r }));
      nextId = SEED_ROWS.length + 1;
      saveData();
    }
    render();
    if (!document.getElementById('view-opex').hidden) renderOpEx();
  }, err => console.error('Firestore error:', err));
}

// ── Auth UI helpers ──
function showApp() {
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('auth-overlay').style.display   = 'none';
  document.getElementById('main-app').style.display       = '';
}

function showAuth() {
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('auth-overlay').style.display   = '';
  document.getElementById('main-app').style.display       = 'none';
}

// ── Auth form ──
let isSignUp = false;

function setAuthMode(signUp) {
  isSignUp = signUp;
  document.getElementById('auth-title').textContent  = signUp ? 'Create an account' : 'Welcome back';
  document.getElementById('auth-sub').textContent    = signUp ? 'Start planning your team' : 'Sign in to your account';
  document.getElementById('auth-submit').textContent = signUp ? 'Create account' : 'Sign in';
  document.getElementById('auth-toggle').textContent = signUp ? 'Sign in instead' : 'Create one';
  document.getElementById('auth-error').textContent  = '';
}

function authErrorMessage(code) {
  const map = {
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/too-many-requests':    'Too many attempts. Please try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

document.getElementById('auth-toggle').addEventListener('click', () => setAuthMode(!isSignUp));

document.getElementById('auth-submit').addEventListener('click', async () => {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please enter your email and password.'; return; }

  submitBtn.disabled = true;
  try {
    if (isSignUp) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    errEl.textContent  = authErrorMessage(err.code);
    submitBtn.disabled = false;
  }
});

document.getElementById('auth-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('auth-submit').click();
});

// ── Auth state listener ──
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    document.getElementById('user-initial').textContent       = user.email[0].toUpperCase();
    document.getElementById('user-dropdown-email').textContent = user.email;
    showApp();
    subscribeToData(user.uid);
  } else {
    if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
    rows = [];
    showAuth();
    render();
  }
});

// ── User menu ──
document.getElementById('user-avatar-btn').addEventListener('click', e => {
  e.stopPropagation();
  const dd = document.getElementById('user-dropdown');
  dd.hidden = !dd.hidden;
});

document.addEventListener('click', () => {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.hidden = true;
});

document.getElementById('sign-out-btn').addEventListener('click', () => auth.signOut());

// ── Sidebar toggle ──
document.getElementById('burger-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── Navigation ──
document.querySelectorAll('.nav-item[data-tool]').forEach(el =>
  el.addEventListener('click', () => switchTool(el.dataset.tool))
);

// ── Event listeners ──
document.getElementById('add-row-btn').addEventListener('click', addRow);
document.getElementById('add-row-btn').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') addRow();
});

// ── Theme toggle ──
const html        = document.documentElement;
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const themeBtn    = document.getElementById('theme-toggle');
const themeIcon   = themeBtn.querySelector('i');

function isDark() {
  if (html.classList.contains('dark'))  return true;
  if (html.classList.contains('light')) return false;
  return prefersDark.matches;
}

function syncIcon() {
  themeIcon.className = isDark() ? 'ti ti-sun' : 'ti ti-moon';
}

themeBtn.addEventListener('click', () => {
  const dark = isDark();
  html.classList.toggle('dark', !dark);
  html.classList.toggle('light', dark);
  syncIcon();
});

prefersDark.addEventListener('change', () => {
  if (!html.classList.contains('dark') && !html.classList.contains('light')) syncIcon();
});

syncIcon();
