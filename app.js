// ── Constants ──
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FY_MONTHS = 12;

// ── State ──
let rows = [
  { id: 1, role: 'Senior Engineer',  rate: 140000, type: 'yearly',  start: 1, status: 'filled',  dept: 'Engineering' },
  { id: 2, role: 'Product Manager',  rate: 110000, type: 'yearly',  start: 1, status: 'filled',  dept: 'Product' },
  { id: 3, role: 'Sales Rep',        rate: 65,     type: 'hourly',  start: 3, status: 'open',    dept: 'Sales' },
  { id: 4, role: 'Designer',         rate: 9500,   type: 'monthly', start: 6, status: 'planned', dept: 'Design' },
];
let nextId = 5;

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

// ── Render table ──
function render() {
  const tbody = document.getElementById('hc-body');
  tbody.innerHTML = '';

  rows.forEach(r => {
    const tr = document.createElement('tr');

    // Role title
    const tdRole = cell();
    tdRole.appendChild(editInput(r.role, v => updateField(r.id, 'role', v)));

    // Rate
    const tdRate = cell();
    const rateInput = document.createElement('input');
    rateInput.type  = 'number';
    rateInput.value = r.rate;
    rateInput.style.width = '100%';
    rateInput.addEventListener('change', e => updateField(r.id, 'rate', +e.target.value));
    tdRate.appendChild(rateInput);

    // Type
    const tdType = cell();
    tdType.appendChild(selectEl(
      [['yearly','Yearly'],['monthly','Monthly'],['hourly','Hourly']],
      r.type,
      v => updateField(r.id, 'type', v)
    ));

    // Start month
    const tdStart = cell();
    tdStart.appendChild(selectEl(
      MONTHS.map((m, i) => [String(i + 1), m]),
      String(r.start),
      v => updateField(r.id, 'start', +v)
    ));

    // Monthly cost (read-only)
    const tdMonthly = cell('cost-cell');
    tdMonthly.textContent = fmt(monthlyCost(r));

    // Annual cost (read-only)
    const tdAnnual = cell('cost-cell');
    tdAnnual.textContent = fmt(annualCost(r));

    // Status
    const tdStatus = cell();
    tdStatus.appendChild(selectEl(
      [['filled','Filled'],['open','Open'],['planned','Planned']],
      r.status,
      v => updateField(r.id, 'status', v)
    ));

    // Department
    const tdDept = cell();
    tdDept.appendChild(editInput(r.dept, v => updateField(r.id, 'dept', v)));

    // Delete
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
    opt.value   = val;
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
  if (r) { r[field] = val; render(); }
}

function deleteRow(id) {
  rows = rows.filter(r => r.id !== id);
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
  render();
  // Focus the role input of the new row
  const tbody = document.getElementById('hc-body');
  const lastRow = tbody.lastElementChild;
  if (lastRow) lastRow.querySelector('input').focus();
}

// ── CSV export ──
function exportCSV() {
  const header = ['Role','Rate','Type','Start Month','Monthly Cost','Annual Cost','Status','Department'];
  const rowData = rows.map(r => [
    r.role,
    r.rate,
    r.type,
    MONTHS[r.start - 1],
    monthlyCost(r),
    annualCost(r),
    r.status,
    r.dept,
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

// ── Event listeners ──
document.getElementById('add-row-btn').addEventListener('click', addRow);
document.getElementById('add-row-btn').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') addRow();
});

// ── Init ──
render();
