// NAVIX — admin dashboard for form leads (Firebase Auth + Firestore, realtime)
const C = window.SITE_CONFIG || {};
const FB = C.firebase || {};
const DEMO = new URLSearchParams(location.search).has('demo');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const STATUS = { new: 'Nouveau', contacted: 'Contacté', won: 'Gagné', lost: 'Perdu' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = (id) => ['loginView', 'setupView', 'dashView'].forEach(v => { $('#' + v).hidden = v !== id; });

let tt;
const toast = (msg, type = 'ok') => {
  const t = $('#toast');
  t.textContent = msg; t.className = `toast ${type}`; t.hidden = false; t.style.direction = 'ltr';
  clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 4000);
};

const WA_SVG = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.8 2 6.9L3 29l6.7-2.2c2 1.1 4.1 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm5.9 15.3c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';
const DEL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

const waNumber = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 8) d = '216' + d; // Tunisian local number
  return d;
};
const waUrl = (l) => `https://wa.me/${waNumber(l.whatsapp)}?text=${encodeURIComponent(`Salam ${l.name || ''}, c'est NAVIX 👋 On a bien reçu ta demande.`)}`;
const fmtDate = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtTime = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const ago = (d) => {
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};

/* ============ state + rendering ============ */
let leads = [];
let known = null;          // ids seen so far (null until first load)
let backend = null;
const filt = { s: '', pack: '', q: '' };

function yesNo(v) {
  if (!v) return '<span class="tag">—</span>';
  const y = /^y/i.test(v);
  return `<span class="tag ${y ? 'yes' : 'no'}">${y ? 'Oui' : 'Non'}</span>`;
}

function render(freshIds = new Set()) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now - 7 * 864e5);
  const count = (s) => leads.filter(l => (l.status || 'new') === s).length;

  $('#stTotal').textContent = leads.length;
  $('#stToday').textContent = leads.filter(l => l.date >= startToday).length;
  $('#stWeek').textContent = leads.filter(l => l.date >= weekAgo).length;
  $('#stNew').textContent = count('new');
  $('#stWon').textContent = count('won');
  $('#stRate').textContent = leads.length ? `${Math.round(count('won') / leads.length * 100)}%` : '';
  $('#cAll').textContent = leads.length;
  $('#cNew').textContent = count('new');
  $('#cContacted').textContent = count('contacted');
  $('#cWon').textContent = count('won');
  $('#cLost').textContent = count('lost');
  const n = count('new');
  document.title = `${n ? `(${n}) ` : ''}NAVIX · Admin`;

  const q = filt.q.trim().toLowerCase();
  const list = leads.filter(l =>
    (!filt.s || (l.status || 'new') === filt.s) &&
    (!filt.pack || (filt.pack === '-' ? !l.pack : l.pack === filt.pack)) &&
    (!q || `${l.name} ${l.whatsapp}`.toLowerCase().includes(q))
  );

  $('#rows').innerHTML = list.map(l => {
    const st = l.status || 'new';
    return `<tr data-id="${esc(l.id)}" class="${freshIds.has(l.id) ? 'fresh' : ''}">
      <td class="t-date" data-l="Date"><b>${fmtDate(l.date)}</b>${fmtTime(l.date)} · ${ago(l.date)}</td>
      <td class="t-name">${esc(l.name) || '—'}</td>
      <td data-l="WhatsApp"><a class="wa-pill" href="${waUrl(l)}" target="_blank" rel="noopener">${WA_SVG}${esc(l.whatsapp)}</a></td>
      <td data-l="Business">${esc(l.businessType) || '—'}${l.ecomType ? ` <span class="tag">${esc(l.ecomType)}</span>` : ''}</td>
      <td data-l="Ads">${yesNo(l.runningAds)}</td>
      <td data-l="Appel">${esc(l.callTime) || '—'}</td>
      <td data-l="Footage">${yesNo(l.hasFootage)}</td>
      <td data-l="Pack">${l.pack ? `<span class="tag pack">${esc(l.pack)}</span>` : '—'}</td>
      <td data-l="Statut"><select class="status-sel s-${st}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td class="c-del"><button class="row-del" title="Supprimer">${DEL_SVG}</button></td>
    </tr>`;
  }).join('');
  $('#empty').hidden = list.length > 0;
  $('#empty p').textContent = leads.length ? 'Aucun lead ne correspond au filtre.' : 'Aucun lead pour le moment.';
}

function onData(next) {
  leads = next;
  const fresh = new Set();
  if (known) {
    next.forEach(l => { if (!known.has(l.id)) fresh.add(l.id); });
    if (fresh.size) {
      const first = next.find(l => fresh.has(l.id));
      toast(`🔔 Nouveau lead : ${first.name || first.whatsapp}`);
      beep();
    }
  }
  known = new Set(next.map(l => l.id));
  render(fresh);
}

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .4);
    o.start(); o.stop(a.currentTime + .4);
  } catch (e) { /* no audio */ }
}

/* ============ drawer ============ */
function openDrawer(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  const item = (k, v) => `<div class="d-item"><small>${k}</small><b>${esc(v) || '—'}</b></div>`;
  $('#drawerBody').innerHTML = `
    <p class="d-name">${esc(l.name)}</p>
    <p class="d-date">${l.date.toLocaleString('fr-FR')} · ${ago(l.date)}</p>
    <div class="d-actions">
      <a class="btn btn-wa" href="${waUrl(l)}" target="_blank" rel="noopener">${WA_SVG.replace('<svg', '<svg class="ico"')} WhatsApp</a>
      <a class="btn btn-ghost" href="tel:+${waNumber(l.whatsapp)}">Appeler</a>
    </div>
    <div class="d-grid">
      ${item('WhatsApp', l.whatsapp)}${item('Statut', STATUS[l.status || 'new'])}
      ${item('Business', l.businessType)}${item('E-commerce', l.ecomType)}
      ${item('Fait des Ads', l.runningAds)}${item('Footage prêt', l.hasFootage)}
      ${item("Heure d'appel", l.callTime)}${item('Pack', l.pack)}
    </div>
    <div class="d-note">
      <label for="noteTa">Note interne</label>
      <textarea id="noteTa" placeholder="Ex : rappeler jeudi, veut 10 vidéos…">${esc(l.note)}</textarea>
      <button class="btn btn-primary btn-block" id="noteSave">Enregistrer la note</button>
    </div>`;
  $('#noteSave').onclick = async () => {
    try { await backend.setNote(id, $('#noteTa').value.trim()); toast('Note enregistrée ✅'); }
    catch (e) { console.error(e); toast('Erreur : note non enregistrée', 'err'); }
  };
  $('#drawer').hidden = false;
}
$$('[data-close]').forEach(el => el.addEventListener('click', () => { $('#drawer').hidden = true; }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#drawer').hidden = true; });

/* ============ events ============ */
$('#rows').addEventListener('change', async (e) => {
  const sel = e.target.closest('.status-sel');
  if (!sel) return;
  const id = sel.closest('tr').dataset.id;
  sel.className = `status-sel s-${sel.value}`;
  try { await backend.setStatus(id, sel.value); }
  catch (err) { console.error(err); toast('Erreur : statut non modifié', 'err'); }
});
$('#rows').addEventListener('click', async (e) => {
  if (e.target.closest('.status-sel, .wa-pill')) return;
  const tr = e.target.closest('tr');
  if (!tr) return;
  if (e.target.closest('.row-del')) {
    const l = leads.find(x => x.id === tr.dataset.id);
    if (confirm(`Supprimer le lead « ${l?.name || ''} » ?`)) {
      try { await backend.remove(tr.dataset.id); toast('Lead supprimé'); }
      catch (err) { console.error(err); toast('Erreur : suppression impossible', 'err'); }
    }
    return;
  }
  openDrawer(tr.dataset.id);
});
$('#statusChips').addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  $$('.chip').forEach(x => x.classList.toggle('on', x === c));
  filt.s = c.dataset.s; render();
});
$('#packFilter').addEventListener('change', e => { filt.pack = e.target.value; render(); });
$('#q').addEventListener('input', e => { filt.q = e.target.value; render(); });
$('#csvBtn').addEventListener('click', () => {
  const cols = ['date', 'name', 'whatsapp', 'businessType', 'ecomType', 'runningAds', 'callTime', 'hasFootage', 'pack', 'status', 'note'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(','), ...leads.map(l => cols.map(c => cell(c === 'date' ? l.date.toLocaleString('fr-FR') : l[c])).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `navix-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
});
setInterval(() => { if (!$('#dashView').hidden) render(); }, 60000); // refresh "il y a X min"

/* ============ backends ============ */
function demoBackend() {
  const names = ['Bioyra Cosmetics', 'Sarra Ben Ali', 'Herbal Touch', 'Maison Jasmin', 'Yassine Store', 'Nour Skincare', 'Tunis Kicks', 'Dar Zitouna', 'Amira Shop', 'FitLab TN', 'Bébé Confort', 'Oud Royal', 'Karim Tech', 'Lina Mode'];
  const packs = ['Starter', 'Growth', 'Scale', '', 'Growth'];
  const st = ['new', 'new', 'contacted', 'won', 'new', 'lost', 'contacted'];
  let data = names.map((n, i) => ({
    id: 'd' + i, name: n, whatsapp: `+216 ${20 + i} ${100 + i * 7} ${300 + i * 11}`,
    businessType: i % 5 === 3 ? 'Service' : 'E-commerce', ecomType: i % 5 === 3 ? '' : (i % 2 ? 'Brand' : 'General Store'),
    runningAds: i % 3 ? 'Yes' : 'No', callTime: i % 2 ? 'Matin 9h-12h' : 'Après-midi 12h-18h',
    hasFootage: i % 4 ? 'Yes' : 'No', pack: packs[i % 5], status: st[i % 7], note: '',
    date: new Date(Date.now() - (i * i * 2.3 + i * 5 + 3) * 3600e3 / 3)
  }));
  const emit = () => onData([...data].sort((a, b) => b.date - a.date));
  setTimeout(() => { // simulate a lead arriving live
    data.push({ id: 'dnew', name: 'Nouvelle Brand', whatsapp: '+216 55 123 456', businessType: 'E-commerce', ecomType: 'Brand', runningAds: 'Yes', callTime: 'Matin 9h-12h', hasFootage: 'Yes', pack: 'Growth', status: 'new', note: '', date: new Date() });
    emit();
  }, 6000);
  return {
    start: emit,
    setStatus: async (id, s) => { data.find(x => x.id === id).status = s; emit(); },
    setNote: async (id, n) => { data.find(x => x.id === id).note = n; emit(); },
    remove: async (id) => { data = data.filter(x => x.id !== id); emit(); },
    signOut: async () => { location.href = 'admin.html'; },
  };
}

async function firebaseBackend() {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = initializeApp(FB);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  let unsub = null;

  const b = {
    setStatus: (id, s) => F.updateDoc(F.doc(db, 'leads', id), { status: s, updatedAt: F.serverTimestamp() }),
    setNote: (id, n) => F.updateDoc(F.doc(db, 'leads', id), { note: n, updatedAt: F.serverTimestamp() }),
    remove: (id) => F.deleteDoc(F.doc(db, 'leads', id)),
    signOut: () => A.signOut(auth),
  };

  // login form
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = $('#loginMsg');
    msg.className = 'login-msg'; msg.textContent = '';
    $('#loginBtn').disabled = true;
    try { await A.signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); }
    catch (err) { msg.textContent = 'Email ou mot de passe incorrect.'; console.error(err); }
    finally { $('#loginBtn').disabled = false; }
  });
  $('#resetBtn').addEventListener('click', async () => {
    const email = $('#loginForm').email.value.trim(), msg = $('#loginMsg');
    if (!email) { msg.className = 'login-msg'; msg.textContent = "Écris ton email d'abord."; return; }
    try { await A.sendPasswordResetEmail(auth, email); msg.className = 'login-msg ok'; msg.textContent = 'Email de réinitialisation envoyé.'; }
    catch (err) { msg.className = 'login-msg'; msg.textContent = "Impossible d'envoyer l'email."; }
  });

  A.onAuthStateChanged(auth, (user) => {
    if (unsub) { unsub(); unsub = null; }
    if (!user) { known = null; leads = []; show('loginView'); return; }
    $('#who').textContent = user.email;
    show('dashView');
    const q = F.query(F.collection(db, 'leads'), F.orderBy('createdAt', 'desc'));
    unsub = F.onSnapshot(q, (snap) => {
      $('.live').classList.remove('off'); $('#liveTxt').textContent = 'En direct';
      onData(snap.docs.map(d => {
        const x = d.data({ serverTimestamps: 'estimate' });
        return { id: d.id, ...x, date: x.createdAt?.toDate ? x.createdAt.toDate() : new Date() };
      }));
    }, async (err) => {
      console.error(err);
      if (err.code === 'permission-denied') {
        await A.signOut(auth);
        $('#loginMsg').className = 'login-msg';
        $('#loginMsg').textContent = "Ce compte n'a pas l'accès admin (voir firestore.rules).";
      } else {
        $('.live').classList.add('off'); $('#liveTxt').textContent = 'Hors ligne';
      }
    });
  });
  return b;
}

/* ============ boot ============ */
(async () => {
  $('#logoutBtn').addEventListener('click', () => backend && backend.signOut());
  if (DEMO) {
    backend = demoBackend();
    $('#demoBanner').hidden = false;
    $('#who').textContent = 'demo@navix';
    show('dashView');
    backend.start();
    return;
  }
  if (!FB.apiKey || !FB.projectId) { show('setupView'); return; }
  try { backend = await firebaseBackend(); }
  catch (e) { console.error(e); show('setupView'); }
})();
