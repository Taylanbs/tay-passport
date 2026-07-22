/* ===================== Passaporte T.A.Y. — app da paciente =====================
   Funciona offline: tudo é salvo primeiro no localStorage do navegador.
   Quando há internet, cada registro é enviado ao Google Apps Script (config/site.json)
   que grava na planilha do Google. Nada aqui depende de banco de dados.
================================================================================= */

let cfg = null;
let pid = null;
let selected = { experience: null, arrival: null, leaving: [], symbolic: [], visto: [], rating: 0 };

const PAGES = [
  { id: 'bemvinda', label: 'Bem-vinda' },
  { id: 'carimbo', label: 'Novo Carimbo' },
  { id: 'meuscarimbos', label: 'Meus Carimbos' },
  { id: 'missoes', label: 'Missões' },
  { id: 'desejos', label: 'Lista de Desejos' },
  { id: 'vistos', label: 'Vistos T.A.Y.' },
];

function storageKey(name) { return `tay_${name}_${pid}`; }
function loadLS(name, fallback) {
  try { return JSON.parse(localStorage.getItem(storageKey(name))) ?? fallback; }
  catch (e) { return fallback; }
}
function saveLS(name, value) { localStorage.setItem(storageKey(name), JSON.stringify(value)); }

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ---------------------------- boot ---------------------------- */
(async function init() {
  try {
    const { site, patient } = await TAY.loadAll();
    cfg = patient;
    pid = cfg.patient_id;
  } catch (e) {
    document.getElementById('loading').innerHTML =
      'Não encontramos seu passaporte. Verifique o link com sua nutricionista. <br><small>' + e.message + '</small>';
    return;
  }
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  renderTabs();
  renderCover();
  renderStampForm();
  renderStampsList();
  renderMissions();
  renderWishlist();
  renderVistos();
  wireForm();
  switchPage('bemvinda');

  window.addEventListener('online', flushQueue);
  flushQueue();
  setInterval(flushQueue, 20000);
})();

/* ---------------------------- navigation ---------------------------- */
function renderTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = PAGES.map(p => `<button class="tab-btn" data-page="${p.id}">${p.label}</button>`).join('');
  tabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
}
function switchPage(id) {
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.dataset.page === id));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.toggle('active', el.dataset.page === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------- cover ---------------------------- */
function renderCover() {
  document.getElementById('cover-epigraph').textContent = cfg.epigrafe || '';
  document.getElementById('welcome-title').textContent = cfg.saudacao || 'Bem-vinda ao seu Passaporte';
  document.getElementById('rule-minutes').textContent = cfg.regra_tempo_minutos || 30;
  updateStampCount();
}
function updateStampCount() {
  const entries = loadLS('entries', []);
  document.getElementById('cover-count').textContent = `${entries.length} de ${cfg.total_carimbos} carimbos`;
}

/* ---------------------------- stamp form ---------------------------- */
function chipEl(container, value, label, multi, group) {
  const el = document.createElement('div');
  el.className = 'chip' + (multi ? ' multi' : '');
  el.dataset.v = value;
  el.textContent = label;
  el.addEventListener('click', () => {
    if (multi) {
      const arr = selected[group];
      const i = arr.indexOf(value);
      if (i >= 0) { arr.splice(i, 1); el.classList.remove('selected'); }
      else { arr.push(value); el.classList.add('selected'); }
    } else {
      [...container.children].forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selected[group] = value;
    }
  });
  container.appendChild(el);
}

function renderStampForm() {
  const entries = loadLS('entries', []);
  document.getElementById('stamp-eyebrow').textContent = `Carimbo Nº ${entries.length + 1} de ${cfg.total_carimbos}`;
  document.getElementById('f-experience-label').textContent = '☕ O que escolhi experimentar?';

  const expWrap = document.getElementById('f-experience-chips');
  expWrap.innerHTML = '';
  (cfg.opcoes_experiencia || []).forEach(opt => chipEl(expWrap, opt, opt, false, 'experience'));
  expWrap.addEventListener('click', () => {
    document.getElementById('f-experience-other').style.display =
      selected.experience === 'Outro' ? 'block' : 'none';
  });

  document.getElementById('f-arrival-chips').querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#f-arrival-chips .chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selected.arrival = el.dataset.v;
    });
  });
  document.getElementById('f-leaving-chips').querySelectorAll('.chip').forEach(el => {
    el.classList.add('multi');
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
      const v = el.dataset.v;
      const i = selected.leaving.indexOf(v);
      if (i >= 0) selected.leaving.splice(i, 1); else selected.leaving.push(v);
    });
  });

  const symWrap = document.getElementById('f-symbolic-chips');
  symWrap.innerHTML = '';
  (cfg.carimbos_simbolicos || []).forEach(s => chipEl(symWrap, s.id, `${s.emoji} ${s.nome}`, true, 'symbolic'));

  const vistoWrap = document.getElementById('f-visto-chips');
  vistoWrap.innerHTML = '';
  (cfg.vistos || []).forEach(v => chipEl(vistoWrap, v.id, `${v.emoji} ${v.nome}`, true, 'visto'));

  document.querySelectorAll('#f-stars span').forEach(star => {
    star.addEventListener('click', () => {
      selected.rating = parseInt(star.dataset.v, 10);
      document.querySelectorAll('#f-stars span').forEach(s => {
        s.classList.toggle('on', parseInt(s.dataset.v, 10) <= selected.rating);
      });
    });
  });

  document.getElementById('f-date').valueAsDate = new Date();
}

function resetForm() {
  document.getElementById('stamp-form').reset();
  selected = { experience: null, arrival: null, leaving: [], symbolic: [], visto: [], rating: 0 };
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#f-stars span').forEach(s => s.classList.remove('on'));
  document.getElementById('f-experience-other').style.display = 'none';
  document.getElementById('f-date').valueAsDate = new Date();
}

function wireForm() {
  document.getElementById('stamp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const entries = loadLS('entries', []);
    const entry = {
      id: uuid(),
      stamp_number: entries.length + 1,
      place: document.getElementById('f-place').value,
      city: document.getElementById('f-city').value,
      date: document.getElementById('f-date').value,
      experience: selected.experience,
      experience_other: document.getElementById('f-experience-other').value,
      attention: document.getElementById('f-attention').value,
      arrival: selected.arrival,
      arrival_other: document.getElementById('f-arrival-other').value,
      leaving: selected.leaving,
      phrase: document.getElementById('f-phrase').value,
      beauty: document.getElementById('f-beauty').value,
      rating: selected.rating,
      symbolic: selected.symbolic,
      visto: selected.visto,
      created_at: new Date().toISOString(),
    };
    entries.push(entry);
    saveLS('entries', entries);

    updateStampCount();
    renderStampsList();
    renderStampForm();
    renderVistos();
    resetForm();
    switchPage('meuscarimbos');

    await queueSync('carimbo', entry);
  });
}

/* ---------------------------- stamps list ---------------------------- */
function renderStampsList() {
  const entries = loadLS('entries', []).slice().reverse();
  const el = document.getElementById('stamps-list');
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state">Seu primeiro carimbo ainda não foi registrado. Que tal começar hoje?</div>';
    return;
  }
  el.innerHTML = entries.map(en => {
    const symbolicNames = (en.symbolic || []).map(id => {
      const s = (cfg.carimbos_simbolicos || []).find(x => x.id === id);
      return s ? `${s.emoji} ${s.nome}` : '';
    }).filter(Boolean);
    const vistoNames = (en.visto || []).map(id => {
      const v = (cfg.vistos || []).find(x => x.id === id);
      return v ? `${v.emoji} ${v.nome}` : '';
    }).filter(Boolean);
    return `
      <div class="stamp-card grain">
        <div class="num">${String(en.stamp_number).padStart(2, '0')}</div>
        <h4>📍 ${escapeHtml(en.place || 'Sem nome')}${en.city ? ' · ' + escapeHtml(en.city) : ''}</h4>
        <div class="meta">${formatDate(en.date)} ${en.experience ? '· ' + escapeHtml(en.experience === 'Outro' ? en.experience_other : en.experience) : ''} ${en.rating ? '· ' + '★'.repeat(en.rating) : ''}</div>
        ${en.phrase ? `<div class="phrase">“${escapeHtml(en.phrase)}”</div>` : ''}
        ${en.beauty ? `<div style="margin-top:6px; color:var(--ink-soft); font-size:14px;">❤️ ${escapeHtml(en.beauty)}</div>` : ''}
        <div class="tag-row">
          ${symbolicNames.map(t => `<span class="tag">${t}</span>`).join('')}
          ${vistoNames.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>`;
  }).join('');
}

/* ---------------------------- missions ---------------------------- */
function renderMissions() {
  const done = loadLS('missions_done', {});
  const el = document.getElementById('missions-list');
  el.innerHTML = (cfg.missoes || []).map(m => `
    <div class="mission-item ${done[m.id] ? 'done' : ''}">
      <input type="checkbox" data-id="${m.id}" ${done[m.id] ? 'checked' : ''}>
      <span>${escapeHtml(m.texto)}</span>
    </div>`).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const doneMap = loadLS('missions_done', {});
      doneMap[cb.dataset.id] = cb.checked;
      saveLS('missions_done', doneMap);
      cb.closest('.mission-item').classList.toggle('done', cb.checked);
      await queueSync('missao', { mission_id: cb.dataset.id, completed: cb.checked });
    });
  });
}

/* ---------------------------- wishlist ---------------------------- */
function renderWishlist() {
  const data = loadLS('wishlist', {});
  const customCats = loadLS('wishlist_custom_categories', []);
  const el = document.getElementById('wishlist-container');

  const defaultCats = (cfg.categorias_desejos || []).map(name => ({ name, custom: false }));
  const extraCats = customCats.map(name => ({ name, custom: true }));
  const allCats = [...defaultCats, ...extraCats];

  el.innerHTML = allCats.map(({ name: cat, custom }) => {
    const items = data[cat] || (custom ? [] : Array.from({ length: 3 }, () => ({ text: '', done: false })));
    return `
      <div class="wishlist-cat" data-cat="${escapeAttr(cat)}" data-custom="${custom ? '1' : '0'}">
        <h3>${escapeHtml(cat)} ${custom ? '<button type="button" class="remove-cat-btn" title="Remover categoria">✕</button>' : ''}</h3>
        <div class="wishlist-rows">
          ${items.map((it, i) => `
            <div class="wishlist-row">
              <input type="checkbox" data-i="${i}" ${it.done ? 'checked' : ''}>
              <input type="text" data-i="${i}" value="${escapeAttr(it.text)}" placeholder="Adicionar…">
            </div>`).join('')}
        </div>
        <button type="button" class="btn secondary small add-wish-row">+ adicionar linha</button>
      </div>`;
  }).join('') + `
    <div class="wishlist-cat new-cat-form">
      <h3>Criar nova categoria</h3>
      <div class="wishlist-row">
        <input type="text" id="new-cat-name" placeholder="Ex.: Trilhas, Restaurantes, Ateliês…">
        <button type="button" class="btn small" id="new-cat-add">Adicionar</button>
      </div>
    </div>`;

  el.querySelectorAll('.wishlist-cat[data-cat]').forEach(catEl => {
    const cat = catEl.dataset.cat;
    function persist() {
      const rows = [...catEl.querySelectorAll('.wishlist-row')];
      const items = rows.map(r => ({
        text: r.querySelector('input[type=text]').value,
        done: r.querySelector('input[type=checkbox]').checked,
      }));
      const data = loadLS('wishlist', {});
      data[cat] = items;
      saveLS('wishlist', data);
    }
    catEl.addEventListener('input', persist);
    catEl.addEventListener('change', async (e) => {
      persist();
      if (e.target.type === 'checkbox' && e.target.checked) {
        const text = e.target.closest('.wishlist-row').querySelector('input[type=text]').value;
        await queueSync('desejo', { categoria: cat, item: text });
      }
    });
    catEl.querySelector('.add-wish-row').addEventListener('click', () => {
      const data = loadLS('wishlist', {});
      data[cat] = data[cat] || [];
      data[cat].push({ text: '', done: false });
      saveLS('wishlist', data);
      renderWishlist();
    });
    const removeBtn = catEl.querySelector('.remove-cat-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (!confirm(`Remover a categoria "${cat}"? Os itens dela também somem.`)) return;
        const cats = loadLS('wishlist_custom_categories', []).filter(c => c !== cat);
        saveLS('wishlist_custom_categories', cats);
        const data = loadLS('wishlist', {});
        delete data[cat];
        saveLS('wishlist', data);
        renderWishlist();
      });
    }
  });

  const addCatBtn = document.getElementById('new-cat-add');
  const addCatInput = document.getElementById('new-cat-name');
  addCatBtn.addEventListener('click', async () => {
    const name = addCatInput.value.trim();
    if (!name) return;
    const cats = loadLS('wishlist_custom_categories', []);
    if (cats.includes(name) || (cfg.categorias_desejos || []).includes(name)) {
      addCatInput.value = '';
      return;
    }
    cats.push(name);
    saveLS('wishlist_custom_categories', cats);
    renderWishlist();
    await queueSync('nova_categoria_desejo', { categoria: name });
  });
  addCatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCatBtn.click(); } });
}

/* ---------------------------- vistos ---------------------------- */
function renderVistos() {
  const entries = loadLS('entries', []);
  const counts = {};
  entries.forEach(en => (en.visto || []).forEach(id => counts[id] = (counts[id] || 0) + 1));
  const el = document.getElementById('visto-grid');
  el.innerHTML = (cfg.vistos || []).map(v => `
    <div class="visto-card">
      <div class="emoji">${v.emoji}</div>
      <div class="count">${counts[v.id] || 0}</div>
      <div class="name">${escapeHtml(v.nome)}</div>
    </div>`).join('');
}

/* ---------------------------- sync (offline-first) ---------------------------- */
async function queueSync(type, payload) {
  const queue = loadLS('pending_sync', []);
  queue.push({ id: uuid(), type, payload, patient_id: pid, patient_name: cfg.patient_name, queued_at: new Date().toISOString() });
  saveLS('pending_sync', queue);
  setStatus('pending', `${queue.length} registro(s) aguardando envio`);
  await flushQueue();
}

async function flushQueue() {
  const url = TAY.siteConfig && TAY.siteConfig.sync_url;
  let queue = loadLS('pending_sync', []);
  if (!queue.length) { setStatus('ready', 'tudo sincronizado'); return; }
  if (!url || url.startsWith('COLE_AQUI')) { setStatus('offline', 'backend não configurado ainda'); return; }
  if (!navigator.onLine) { setStatus('offline', `sem internet · ${queue.length} pendente(s)`); return; }

  setStatus('pending', `sincronizando ${queue.length}…`);
  const remaining = [];
  for (const item of queue) {
    try {
      await fetch(url, { method: 'POST', body: JSON.stringify(item) });
    } catch (e) {
      remaining.push(item);
    }
  }
  saveLS('pending_sync', remaining);
  setStatus(remaining.length ? 'pending' : 'ready',
    remaining.length ? `${remaining.length} pendente(s)` : 'tudo sincronizado');
}

function setStatus(kind, text) {
  const pill = document.getElementById('sync-status');
  if (!pill) return;
  pill.className = 'status-pill' + (kind === 'ready' ? '' : ' ' + kind);
  pill.textContent = '● ' + text;
}

/* ---------------------------- utils ---------------------------- */
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }
function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
