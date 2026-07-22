/* ===================== Painel da nutricionista =====================
   Duas abas:
   - Acompanhamento: lê os eventos (carimbos/missões/desejos) da paciente
     selecionada e mostra o progresso, com atualização automática.
   - Pacientes: cadastra e edita a configuração de cada paciente direto na
     planilha (aba "Pacientes"), sem precisar de arquivos JSON nem de GitHub.
====================================================================== */

const TOKEN_KEY = 'tay_dashboard_token';
const POLL_MS = 15000;

let allRows = [];
let allPatients = [];   // [{patient_id, config, created_at, updated_at}]
let currentPatient = null;
let editingPatientId = null;

const DEFAULT_VISTOS = [
  { id: 'presenca', emoji: '☕', nome: 'Presença', significado: 'Conseguiu desacelerar e aproveitar o momento.' },
  { id: 'leveza', emoji: '🌿', nome: 'Leveza', significado: 'Saiu sentindo menos peso emocional.' },
  { id: 'coragem', emoji: '🧭', nome: 'Coragem', significado: 'Fez algo novo ou saiu da rotina.' },
  { id: 'curiosidade', emoji: '📖', nome: 'Curiosidade', significado: 'Aprendeu ou descobriu algo interessante.' },
  { id: 'autocuidado', emoji: '🤍', nome: 'Autocuidado', significado: 'Escolheu cuidar de si de forma intencional.' },
  { id: 'encantamento', emoji: '✨', nome: 'Encantamento', significado: 'Viveu um momento que merece ser lembrado.' },
];
const DEFAULT_SYMBOLIC = [
  { id: 'descoberta', emoji: '☕', nome: 'Descoberta' },
  { id: 'inspirador', emoji: '📚', nome: 'Lugar inspirador' },
  { id: 'paz', emoji: '🌿', nome: 'Momento de paz' },
  { id: 'novidade', emoji: '✨', nome: 'Nova experiência' },
  { id: 'volta', emoji: '❤️', nome: 'Quero voltar' },
];
const DEFAULT_MISSIONS = [
  'Conhecer uma cafeteria nova.',
  'Visitar uma livraria independente.',
  'Passar uma tarde em um parque.',
  'Conhecer um museu ou exposição.',
  'Experimentar algo que nunca pediu.',
  'Assistir ao pôr do sol sem olhar o celular.',
  'Escrever uma página inteira sem interromper para checar notificações.',
  'Convidar alguém especial para compartilhar um momento.',
  'Fazer um passeio sozinha.',
  'Descobrir um lugar que gostaria de mostrar para alguém que ama.',
];

/* ---------------------------- lock screen ---------------------------- */

TAY.loadAllSiteOnly = async function () {
  const site = await fetch('config/site.json').then(r => r.json()).catch(() => ({}));
  this.siteConfig = site;
  return { site };
};

document.getElementById('unlock-btn').addEventListener('click', tryUnlock);
document.getElementById('passphrase').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

(async function autoUnlock() {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (!saved) return;
  await TAY.loadAllSiteOnly();
  TAY.accessToken = saved;
  if (await testToken(saved)) enterDashboard();
})();

async function tryUnlock() {
  await TAY.loadAllSiteOnly();
  const input = document.getElementById('passphrase').value;
  if (await testToken(input)) {
    TAY.accessToken = input;
    localStorage.setItem(TOKEN_KEY, input);
    enterDashboard();
  } else {
    document.getElementById('lock-error').style.display = 'block';
  }
}

async function testToken(token) {
  const url = TAY.siteConfig && TAY.siteConfig.sync_url;
  if (!url || url.startsWith('COLE_AQUI') || !token) return false;
  try {
    const res = await fetch(`${url}?action=patients&token=${encodeURIComponent(token)}`).then(r => r.json());
    return !!res.ok;
  } catch (e) {
    return false;
  }
}

function enterDashboard() {
  document.getElementById('lock').style.display = 'none';
  document.getElementById('dash').style.display = 'block';
  boot();
}

/* ---------------------------- tabs ---------------------------- */

document.querySelectorAll('#main-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#main-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.dash-tab').forEach(sec => sec.classList.toggle('active', sec.id === 'tab-' + btn.dataset.tab));
  });
});

/* ---------------------------- boot / polling ---------------------------- */

async function boot() {
  document.getElementById('logout-btn').onclick = () => { localStorage.removeItem(TOKEN_KEY); location.reload(); };
  wirePatientForm();
  await refreshAll();
  setInterval(refreshAll, POLL_MS);
}

async function refreshAll() {
  const url = TAY.siteConfig && TAY.siteConfig.sync_url;
  const indicator = document.getElementById('live-indicator');
  if (!url || url.startsWith('COLE_AQUI')) {
    document.getElementById('dash-body').innerHTML = '<div class="empty-state">Backend ainda não configurado. Preencha "sync_url" em config/site.json.</div>';
    return;
  }
  try {
    indicator.textContent = '● atualizando…';
    indicator.className = 'status-pill pending';
    const token = encodeURIComponent(TAY.accessToken || '');
    const [patientsRes, eventsRes] = await Promise.all([
      fetch(`${url}?action=patients&token=${token}`).then(r => r.json()),
      fetch(`${url}?action=events&token=${token}`).then(r => r.json()),
    ]);
    if (!patientsRes.ok || !eventsRes.ok) throw new Error(patientsRes.error || eventsRes.error || 'erro');
    allPatients = patientsRes.patients || [];
    allRows = eventsRes.rows || [];
    indicator.textContent = '● ao vivo';
    indicator.className = 'status-pill';

    populatePatientPicker();
    renderDashboard();
    renderPatientsAdminList();
  } catch (e) {
    indicator.textContent = '● offline';
    indicator.className = 'status-pill offline';
  }
}

/* ===================== ABA: ACOMPANHAMENTO ===================== */

function populatePatientPicker() {
  const picker = document.getElementById('patient-picker');
  const prev = picker.value;
  picker.innerHTML = allPatients.map(p =>
    `<option value="${p.patient_id}">${escapeHtml(p.config.patient_name || p.patient_id)}</option>`
  ).join('') || '<option value="">Nenhuma paciente cadastrada ainda</option>';

  const ids = allPatients.map(p => p.patient_id);
  if (ids.includes(prev)) picker.value = prev;
  currentPatient = picker.value || ids[0] || null;
  picker.onchange = () => { currentPatient = picker.value; renderDashboard(); };
}

function renderDashboard() {
  const body = document.getElementById('dash-body');
  if (!currentPatient) {
    body.innerHTML = '<div class="empty-state">Cadastre uma paciente na aba "Pacientes" para começar a acompanhar.</div>';
    return;
  }
  const rec = allPatients.find(p => p.patient_id === currentPatient);
  const cfg = rec ? rec.config : {};
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

/* ===================== ABA: PACIENTES (cadastro/edição) ===================== */

function patientLink(id) {
  const base = window.location.href.replace(/dashboard\.html.*$/, '');
  return `${base}passaporte.html?p=${id}`;
}

function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function wirePatientForm() {
  const form = document.getElementById('patient-form');
  const nameInput = document.getElementById('pf-name');
  const idInput = document.getElementById('pf-id');
  const linkPreview = document.getElementById('pf-link-preview');
  const editIdBtn = document.getElementById('pf-edit-id-btn');

  document.getElementById('pf-missoes').value = DEFAULT_MISSIONS.join('\n');

  function updatePreview() {
    const id = idInput.value.trim() || slugify(nameInput.value);
    linkPreview.textContent = id ? patientLink(id) : '—';
  }
  nameInput.addEventListener('input', updatePreview);
  idInput.addEventListener('input', updatePreview);

  editIdBtn.addEventListener('click', () => {
    idInput.style.display = idInput.style.display === 'none' ? 'block' : 'none';
    if (idInput.style.display === 'block' && !idInput.value) idInput.value = slugify(nameInput.value);
  });

  document.getElementById('pf-cancel-edit').addEventListener('click', resetPatientForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg = buildPatientConfig();
    if (!cfg.patient_id || !cfg.patient_name) {
      setPfStatus('pending', 'Preencha ao menos o nome.');
      return;
    }
    setPfStatus('pending', 'salvando…');
    const url = TAY.siteConfig.sync_url;
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ type: 'patient_upsert', token: TAY.accessToken, payload: cfg }),
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || 'erro ao salvar');
      setPfStatus('ready', `salvo! link: ${patientLink(cfg.patient_id)}`);
      resetPatientForm();
      await refreshAll();
    } catch (err) {
      setPfStatus('offline', 'erro ao salvar — verifique sua internet e tente de novo');
    }
  });

  updatePreview();
}

function buildPatientConfig() {
  const name = document.getElementById('pf-name').value.trim();
  const explicitId = document.getElementById('pf-id').value.trim();
  const id = editingPatientId || explicitId || slugify(name);

  const experiencias = document.getElementById('pf-experiencias').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const categorias = document.getElementById('pf-categorias').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const missoesTexto = document.getElementById('pf-missoes').value
    .split('\n').map(s => s.trim()).filter(Boolean);

  return {
    patient_id: id,
    patient_name: name,
    saudacao: document.getElementById('pf-saudacao').value.trim() || `Bem-vinda ao seu Passaporte, ${name}`,
    epigrafe: document.getElementById('pf-epigrafe').value.trim() || 'Nem toda viagem exige um avião. Algumas começam quando escolhemos estar presentes.',
    total_carimbos: parseInt(document.getElementById('pf-total').value, 10) || 12,
    unidade_destino: 'experiencia',
    rotulo_categoria_singular: document.getElementById('pf-rotulo-singular').value.trim() || 'Experiência',
    rotulo_categoria_plural: document.getElementById('pf-rotulo-plural').value.trim() || 'Experiências',
    opcoes_experiencia: experiencias.length ? experiencias : ['Espresso', 'Cappuccino', 'Chá especial', 'Outro'],
    regra_tempo_minutos: 30,
    missoes: missoesTexto.map((t, i) => ({ id: 'm' + (i + 1), texto: t })),
    categorias_desejos: categorias.length ? categorias : ['Cafeterias', 'Livrarias', 'Museus', 'Parques'],
    vistos: DEFAULT_VISTOS,
    carimbos_simbolicos: DEFAULT_SYMBOLIC,
  };
}

function resetPatientForm() {
  editingPatientId = null;
  document.getElementById('patient-form').reset();
  document.getElementById('pf-missoes').value = DEFAULT_MISSIONS.join('\n');
  document.getElementById('pf-id').value = '';
  document.getElementById('pf-id').style.display = 'none';
  document.getElementById('pf-title').textContent = 'Nova paciente';
  document.getElementById('pf-submit-btn').textContent = 'Salvar paciente';
  document.getElementById('pf-cancel-edit').style.display = 'none';
  document.getElementById('pf-link-preview').textContent = '—';
}

function fillPatientForm(rec) {
  editingPatientId = rec.patient_id;
  const cfg = rec.config;
  document.getElementById('pf-name').value = cfg.patient_name || '';
  document.getElementById('pf-id').value = rec.patient_id;
  document.getElementById('pf-id').style.display = 'block';
  document.getElementById('pf-saudacao').value = cfg.saudacao || '';
  document.getElementById('pf-epigrafe').value = cfg.epigrafe || '';
  document.getElementById('pf-total').value = cfg.total_carimbos || 12;
  document.getElementById('pf-rotulo-singular').value = cfg.rotulo_categoria_singular || '';
  document.getElementById('pf-rotulo-plural').value = cfg.rotulo_categoria_plural || '';
  document.getElementById('pf-experiencias').value = (cfg.opcoes_experiencia || []).join(', ');
  document.getElementById('pf-categorias').value = (cfg.categorias_desejos || []).join(', ');
  document.getElementById('pf-missoes').value = (cfg.missoes || []).map(m => m.texto).join('\n');
  document.getElementById('pf-title').textContent = `Editando: ${cfg.patient_name || rec.patient_id}`;
  document.getElementById('pf-submit-btn').textContent = 'Atualizar paciente';
  document.getElementById('pf-cancel-edit').style.display = 'inline-flex';
  document.getElementById('pf-link-preview').textContent = patientLink(rec.patient_id);
  document.querySelector('[data-tab="pacientes"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setPfStatus(kind, text) {
  const pill = document.getElementById('pf-status');
  pill.style.display = 'inline-flex';
  pill.className = 'status-pill' + (kind === 'ready' ? '' : ' ' + kind);
  pill.textContent = '● ' + text;
}

function renderPatientsAdminList() {
  const el = document.getElementById('patients-list-admin');
  if (!allPatients.length) {
    el.innerHTML = '<div class="empty-state">Nenhuma paciente cadastrada ainda — use o formulário acima.</div>';
    return;
  }
  el.innerHTML = allPatients.map(rec => {
    const link = patientLink(rec.patient_id);
    const count = allRows.filter(r => r.patient_id === rec.patient_id && r.type === 'carimbo').length;
    return `
      <div class="stamp-card" style="margin-bottom:12px;">
        <h4 style="margin-bottom:2px;">${escapeHtml(rec.config.patient_name || rec.patient_id)}</h4>
        <div class="meta">${count} carimbo(s) · id: ${rec.patient_id}</div>
        <div style="font-size:12.5px; word-break:break-all; margin:8px 0; color:var(--teal-deep);">${link}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn secondary small" data-copy="${link}">Copiar link</button>
          <button type="button" class="btn secondary small" data-edit="${rec.patient_id}">Editar</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const old = btn.textContent;
      btn.textContent = 'Copiado ✓';
      setTimeout(() => btn.textContent = old, 1500);
    });
  });
  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = allPatients.find(p => p.patient_id === btn.dataset.edit);
      if (rec) fillPatientForm(rec);
    });
  });
}

/* ---------------------------- utils ---------------------------- */

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
