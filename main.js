(function () {
  const C = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- basics ---------- */
  const nav = $('.nav');
  $('#year').textContent = new Date().getFullYear();
  const waLink = (text) =>
    `https://wa.me/${C.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  $$('.wa-link').forEach(a => { a.href = waLink('Salam NAVIX 👋'); });

  /* ---------- "Get free audit" → scroll to the form, then focus it ---------- */
  const formEl = $('#leadForm');
  const goToForm = (e) => {
    if (e) e.preventDefault();
    nav.classList.remove('open');
    formEl.classList.add('in');
    const y = formEl.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: 'smooth' });
    formEl.classList.remove('flash'); void formEl.offsetWidth; formEl.classList.add('flash');
    setTimeout(() => formEl.elements['name'].focus({ preventScroll: true }), 700);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.js-audit, [data-pack], .nav-links a[href="#contact"]');
    if (a) goToForm(e);
  });
  $('#igLink').href = C.instagram || '#';

  /* ---------- mobile nav ---------- */
  $('#burger').addEventListener('click', () => nav.classList.toggle('open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---------- reveal on scroll ---------- */
  const rio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    rio.observe(el);
  });

  /* ---------- hero video (optional) ----------
     - muted preview plays while the frame is on screen (captions are burned in)
     - click = restart from 0 with sound + native controls
     - no preview with reduced motion or data saver; phones get the lighter file */
  let heroV = null;
  const heroF = $('#heroFrame');
  if (C.heroVideo && heroF) {
    const conn = navigator.connection || {};
    const light = conn.saveData || matchMedia('(max-width: 760px)').matches;
    const src = light && C.heroVideoMobile ? C.heroVideoMobile : C.heroVideo;
    const canPreview = !conn.saveData && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    heroF.classList.add('has-video');
    heroF.removeAttribute('aria-hidden');
    heroF.innerHTML =
      `<video src="${src}" ${C.heroPoster ? `poster="${C.heroPoster}"` : ''} muted loop playsinline preload="none"></video>` +
      `<button class="hero-play" type="button" aria-label="Play the video with sound"><span class="hero-play-ui">` +
        `<span class="hero-play-btn">` +
          `<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z"/></svg>` +
          `<svg class="i-unmute" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="w" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>` +
        `</span>` +
        `<span class="hero-play-lbl">Watch with sound<span class="dur"></span></span>` +
      `</span></button>`;
    heroV = $('video', heroF);
    const playBtn = $('.hero-play', heroF);
    let inView = false, withSound = false;

    heroV.addEventListener('loadedmetadata', () => {
      const d = heroV.duration;
      if (isFinite(d)) $('.dur', heroF).textContent = ` · ${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;
    });
    heroV.addEventListener('waiting', () => heroF.classList.add('loading'));
    ['playing', 'canplay'].forEach(ev => heroV.addEventListener(ev, () => heroF.classList.remove('loading')));
    // preview running → the big play button shrinks to a corner chip so it doesn't cover his face
    heroV.addEventListener('playing', () => { if (!withSound) heroF.classList.add('previewing'); });

    playBtn.addEventListener('click', () => {
      withSound = true;
      muteAll();                       // only one video talks at a time
      heroF.classList.remove('previewing');
      heroF.classList.add('sound');
      playBtn.hidden = true;
      heroV.loop = false;
      heroV.muted = false;
      heroV.controls = true;
      heroV.currentTime = 0;
      heroV.play().catch(() => {});
      heroV.focus({ preventScroll: true });
      // clicked while the frame is half below the fold → bring the whole video on screen
      const r = heroF.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) heroF.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (!inView) heroV.pause();
      else if (!withSound && canPreview) heroV.play().catch(() => {});
    }, { threshold: 0.35 }).observe(heroF);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) heroV.pause();
      else if (inView && !withSound && canPreview) heroV.play().catch(() => {});
    });
  }

  /* ---------- portfolio reels ----------
     - source attached only when a reel gets close to the viewport (lazy)
     - plays muted while visible, pauses when scrolled away
     - tap = sound on for that reel only                                  */
  const reels = $$('.reel');
  const load = (v) => {
    if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = 'auto'; }
  };
  const setIcon = (reel, on) => {
    const i = $('.sound i', reel);
    i.className = on ? 'i-sound' : 'i-mute';
  };
  const muteAll = (except) => reels.forEach(r => {
    const v = $('video', r);
    if (v !== except) { v.muted = true; setIcon(r, false); }
  });

  const preIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { load($('video', e.target)); preIO.unobserve(e.target); } });
  }, { rootMargin: '400px 0px' });

  const playIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = $('video', e.target);
      if (e.isIntersecting) { load(v); v.play().catch(() => {}); }
      else { v.pause(); if (!v.muted) { v.muted = true; setIcon(e.target, false); } }
    });
  }, { threshold: 0.5 });

  reels.forEach(r => {
    const v = $('video', r);
    preIO.observe(r);
    playIO.observe(r);
    v.addEventListener('waiting', () => r.classList.add('loading'));
    ['playing', 'canplay'].forEach(ev => v.addEventListener(ev, () => r.classList.remove('loading')));
    const toggle = () => {
      load(v);
      const turnOn = v.muted;
      muteAll(v);
      if (turnOn && heroV && !heroV.muted) heroV.pause();
      v.muted = !turnOn;
      if (turnOn) { v.currentTime = 0; v.play().catch(() => {}); }
      setIcon(r, turnOn);
    };
    v.addEventListener('click', toggle);
    $('.sound', r).addEventListener('click', toggle);
  });

  // save data when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reels.forEach(r => $('video', r).pause());
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  $$('.proof').forEach(p => p.addEventListener('click', () => {
    $('img', lb).src = $('img', p).src;
    lb.hidden = false;
  }));
  lb.addEventListener('click', () => { lb.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

  /* ---------- pack pre-selection ---------- */
  $$('[data-pack]').forEach(b => b.addEventListener('click', () => {
    $('#packField').value = b.dataset.pack;
    const chip = $('#packChip');
    chip.textContent = `Pack choisi : ${b.dataset.pack}`;
    chip.hidden = false;
  }));

  /* ---------- custom dropdown (business type) ---------- */
  const dd = $('#bizDD');
  const ddBtn = $('.dd-btn', dd), ddVal = $('.dd-value', dd), ddInput = $('#bizInput');
  const opts = $$('li', dd);
  let activeIdx = -1;
  const setActive = (i) => { opts.forEach((o, k) => o.classList.toggle('active', k === i)); activeIdx = i; if (opts[i]) opts[i].scrollIntoView({ block: 'nearest' }); };
  const openDD = () => { dd.classList.add('open'); ddBtn.setAttribute('aria-expanded', 'true'); setActive(Math.max(0, opts.findIndex(o => o.getAttribute('aria-selected') === 'true'))); };
  const closeDD = () => { dd.classList.remove('open'); ddBtn.setAttribute('aria-expanded', 'false'); };
  const choose = (o) => {
    opts.forEach(x => x.setAttribute('aria-selected', x === o ? 'true' : 'false'));
    ddInput.value = o.dataset.value;
    ddVal.classList.remove('placeholder');
    ddVal.innerHTML = o.innerHTML;
    ddBtn.classList.remove('invalid');
    closeDD();
  };
  ddBtn.addEventListener('click', () => dd.classList.contains('open') ? closeDD() : openDD());
  opts.forEach(o => o.addEventListener('click', () => choose(o)));
  document.addEventListener('click', e => { if (!dd.contains(e.target)) closeDD(); });
  ddBtn.addEventListener('keydown', e => {
    if (!dd.classList.contains('open') && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openDD(); return; }
    if (!dd.classList.contains('open')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(opts.length - 1, activeIdx + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, activeIdx - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts[activeIdx]) choose(opts[activeIdx]); }
    else if (e.key === 'Escape' || e.key === 'Tab') closeDD();
  });
  const resetDD = () => { ddInput.value = ''; opts.forEach(x => x.setAttribute('aria-selected', 'false')); ddVal.className = 'dd-value placeholder'; ddVal.textContent = 'اختار نوع البيزنس'; };

  /* ---------- toast ---------- */
  let tt;
  const toast = (msg, type = 'ok') => {
    const t = $('#toast');
    t.textContent = msg; t.className = `toast ${type}`; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 5000);
  };

  /* ---------- form ---------- */
  const form = $('#leadForm');
  const btn = $('#submitBtn');

  const validate = () => {
    let ok = true;
    $$('.invalid', form).forEach(x => x.classList.remove('invalid'));
    const name = form.elements['name'].value.trim();
    const phone = form.whatsapp.value.replace(/[^\d+]/g, '');
    if (name.length < 2) { form.elements['name'].classList.add('invalid'); ok = false; }
    if (phone.replace(/\D/g, '').length < 8) { form.whatsapp.classList.add('invalid'); ok = false; }
    if (!ddInput.value) { ddBtn.classList.add('invalid'); ok = false; }
    ['runningAds', 'callTime', 'hasFootage'].forEach(n => {
      if (!form.querySelector(`input[name=${n}]:checked`)) {
        form.querySelector(`input[name=${n}]`).closest('.choices').classList.add('invalid'); ok = false;
      }
    });
    return ok;
  };
  form.addEventListener('change', e => {
    e.target.classList.remove('invalid');
    const c = e.target.closest('.choices'); if (c) c.classList.remove('invalid');
  });

  const collect = () => {
    const fd = new FormData(form);
    return {
      name: (fd.get('name') || '').trim(),
      whatsapp: (fd.get('whatsapp') || '').trim(),
      businessType: fd.get('businessType') || '',
      ecomType: fd.get('ecomType') || '',
      runningAds: fd.get('runningAds') || '',
      callTime: fd.get('callTime') || '',
      hasFootage: fd.get('hasFootage') || '',
      pack: fd.get('pack') || '',
      page: location.href,
    };
  };

  const toWhatsApp = (d) => {
    const msg =
`Nouvelle demande NAVIX
Nom / Brand: ${d.name}
WhatsApp: ${d.whatsapp}
Business: ${d.businessType}${d.ecomType ? ' / ' + d.ecomType : ''}
Ads: ${d.runningAds}
Appel: ${d.callTime}
Footage: ${d.hasFootage}${d.pack ? '\nPack: ' + d.pack : ''}`;
    window.open(waLink(msg), '_blank');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) { toast('عمّر الخانات الكل من فضلك', 'err'); return; }
    const data = collect();
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = '...جاري الإرسال';
    try {
      if (typeof window.saveLead === 'function') {
        await window.saveLead(data);
        toast('وصلنا طلبك ✅ نكلموك في أقل من 24 ساعة');
      } else {
        toWhatsApp(data);
        toast('كمّل الإرسال على WhatsApp');
      }
      form.reset();
      resetDD();
      $('#packChip').hidden = true;
    } catch (err) {
      console.error(err);
      toWhatsApp(data);
      toast('صار مشكل، كمّل على WhatsApp', 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
})();
