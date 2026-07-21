/* ===================== Painel da nutricionista =====================
   Lê os eventos gravados pelo Apps Script (mesma planilha para todas
   as pacientes, cada evento marcado com patient_id) e also busca o
   patients/{id}.json de cada paciente para saber metas e rótulos.
====================================================================== */

let allRows = [];
let patientConfigs = {};
let currentPatient = null;
const POLL_MS = 15000;

document.getElementById('unlock-btn').addEventListener('click', tryUnlock);
document.getElementById('passphrase').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

async function tryUnlock() {
  const { site } = await TAY.loadAllSiteOnly();
  const input = document.getElementById('passphrase').value;
  if (input && input === (site.dashboard_passphrase || '')) {
    document.getElementById('lock').style.display = 'none';
    document.getElementById('dash').style.display = 'block';
    boot();
  } else {
    document.getElementById('lock-error').style.display = 'block';
  }
}

TAY.loadAllSiteOnly = async function () {
  const site = await fetch('config/site.json').then(r => r.json()).catch(() => ({}));
  this.siteConfig = site;
  return { site };
};

async function boot() {
  await refreshData();
  setInterval(refreshData, POLL_MS);
}

async function refreshData() {
  const url = TAY.siteConfig && TAY.siteConfig.sync_url;
  const indicator = document.getElementById('live-indicator');
  if (!url || url.startsWith('COLE_AQUI')) {
    document.getElementById('dash-body').innerHTML =
      '<div class="empty-state">Backend ainda não configurado. Preencha "sync_url" em config/site.json.</div>';
    return;
  }
  try {
    indicator.textContent = '● atualizando…';
    indicator.className = 'status-pill pending';
    const res = await fetch(url).then(r => r.json());
    if (!res.ok) throw new Error(res.error || 'erro desconhecido');
    allRows = res.rows || [];
    indicator.textContent = '● ao vivo';
    indicator.className = 'status-pill';
    await populatePatientPicker();
    renderDashboard();
  } catch (e) {
    indicator.textContent = '● offline';
    indicator.className = 'status-pill offline';
  }
}

async function populatePatientPicker() {
  const ids = [...new Set(allRows.map(r => r.patient_id).filter(Boolean))];
  const picker = document.getElementById('patient-picker');
  const prev = picker.value;

  for (const id of ids) {
    if (!patientConfigs[id]) {
      patientConfigs[id] = await fetch(`patients/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    }
  }

  picker.innerHTML = ids.map(id => {
    const name = patientConfigs[id]?.patient_name || (allRows.find(r => r.patient_id === id)?.patient_name) || id;
    return `<option value="${id}">${name}</option>`;
  }).join('') || '<option value="">Nenhuma paciente ainda</option>';

  if (ids.includes(prev)) picker.value = prev;
  currentPatient = picker.value || ids[0] || null;
  picker.onchange = () => { currentPatient = picker.value; renderDashboard(); };
}

function renderDashboard() {
  const body = document.getElementById('dash-body');
  if (!currentPatient) {
    body.innerHTML = '<div class="empty-state">Assim que uma paciente registrar o primeiro carimbo, ela aparecerá aqui automaticamente.</div>';
    return;
  }
  const cfg = patientConfigs[currentPatient] || {};
  const rows = allRows.filter(r => r.patient_id === currentPatient);
  const carimbos = rows.filter(r => r.type === 'carimbo').map(r => r.payload)
    .sort((a, b) => (a.stamp_number || 0) - (b.stamp_number || 0));
  const missoes = rows.filter(r => r.type === 'missao');
  const missoesFeitas = new Set(missoes.filter(m => m.payload.completed).map(m => m.payload.mission_id));

  const totalMetas = cfg.total_carimbos || 12;
  const pct = Math.min(100, Math.round((carimbos.length / totalMetas) * 100));
  const avgRating = carimbos.length
    ? (carimbos.reduce((s, c) => s + (c.rating || 0), 0) / carimbos.length).toFixed(1)
    : '—';

  const vistoCounts = {};
  carimbos.forEach(c => (c.visto || []).forEach(id => vistoCounts[id] = (vistoCounts[id] || 0) + 1));

  const leavingCounts = {};
  carimbos.forEach(c => (c.leaving || []).forEach(l => leavingCounts[l] = (leavingCounts[l] || 0) + 1));
  const topLeaving = Object.entries(leavingCounts).sort((a, b) => b[1] - a[1])[0];

  body.innerHTML = `
    <div class="dash-grid">
      <div class="stat-card">
        <div class="label">Progresso do passaporte</div>
        <div class="value">${carimbos.length}/${totalMetas}</div>
        <div class="progress-bar"><div style="width:${pct}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="label">Nota média das experiências</div>
        <div class="value">${avgRating} ★</div>
      </div>
      <div class="stat-card">
        <div class="label">Missões concluídas</div>
        <div class="value">${missoesFeitas.size}/${(cfg.missoes || []).length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Como ela mais tem saído</div>
        <div class="value" style="font-size:22px;">${topLeaving ? topLeaving[0] : '—'}</div>
      </div>
    </div>

    <div class="stat-card" style="margin-bottom:24px;">
      <div class="label" style="margin-bottom:10px;">Vistos T.A.Y. acumulados</div>
      <div class="visto-grid">
        ${(cfg.vistos || []).map(v => `
          <div class="visto-card">
            <div class="emoji">${v.emoji}</div>
            <div class="count">${vistoCounts[v.id] || 0}</div>
            <div class="name">${v.nome}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="stat-card">
      <div class="label" style="margin-bottom:6px;">Linha do tempo</div>
      ${carimbos.length ? carimbos.slice().reverse().map(c => `
        <div class="timeline-entry">
          <div class="dot"></div>
          <div>
            <strong>${escapeHtml(c.place || 'Sem nome')}</strong> ${c.city ? '· ' + escapeHtml(c.city) : ''}
            <div style="font-size:12.5px; color:var(--ink-soft);">${formatDate(c.date)} ${c.rating ? '· ' + '★'.repeat(c.rating) : ''}</div>
            ${c.phrase ? `<div style="font-style:italic; margin-top:4px;">"${escapeHtml(c.phrase)}"</div>` : ''}
          </div>
        </div>`).join('') : '<div class="empty-state">Ainda sem carimbos registrados.</div>'}
    </div>
  `;
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
