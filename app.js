(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Slider avant / après (souris, doigt, clavier) ---------- */
  function initBa(el) {
    const range = $('.ba-range', el);
    const api = {
      user: false, drag: false, pos: +(el.dataset.pos || 50),
      set(p) {
        p = clamp(p, 0, 100); api.pos = p;
        el.style.setProperty('--pos', p + '%');
        range.value = Math.round(p);
        el.classList.toggle('lo', p < 14);
        el.classList.toggle('hi', p > 86);
      }
    };
    const fromEvent = e => { const r = el.getBoundingClientRect(); api.set((e.clientX - r.left) / r.width * 100); };
    el.addEventListener('pointerdown', e => {
      if (e.button) return;
      api.drag = api.user = true;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      fromEvent(e);
    });
    el.addEventListener('pointermove', e => { if (api.drag) fromEvent(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, () => { api.drag = false; }));
    range.addEventListener('input', () => { api.user = true; api.set(+range.value); });
    api.set(api.pos);
    return (el._ba = api);
  }
  const sliders = $$('.ba').map(initBa);

  // petite démonstration automatique la première fois qu'un slider apparaît
  if (!reduce && 'IntersectionObserver' in window) {
    const demo = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      demo.unobserve(en.target);
      const api = en.target._ba, t0 = performance.now(), dur = 1900;
      (function step(now) {
        if (api.user) return;
        const t = clamp((now - t0) / dur);
        api.set(50 + 34 * Math.sin(t * Math.PI * 2) * (1 - t * .15));
        if (t < 1) requestAnimationFrame(step); else api.set(50);
      })(t0);
    }), { threshold: .65 });
    $$('.ba[data-demo]').forEach(el => demo.observe(el));
  }

  /* ---------- Apparitions / disparitions ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      en.target.classList.toggle('in', en.isIntersecting);
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- Compteurs ---------- */
  const fmt = (n, sep) => sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
  function count(el) {
    const to = +el.dataset.count, pre = el.dataset.prefix || '', sep = el.dataset.sep;
    if (reduce) { el.textContent = pre + fmt(to, sep); return; }
    const t0 = performance.now(), dur = 1400;
    (function step(now) {
      const t = clamp((now - t0) / dur);
      el.textContent = pre + fmt(Math.round(to * ease(t)), sep);
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { cio.unobserve(en.target); count(en.target); }
    }), { threshold: .6 });
    $$('[data-count]').forEach(el => cio.observe(el));
  }

  /* ---------- Vidéo : chargée seulement à l'approche, lecture auto sans son ---------- */
  const video = $('#visite');
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) {
        if (!video.src) video.src = video.dataset.src;
        video.muted = true;
        const p = video.play(); if (p) p.catch(() => { video.controls = true; });
      } else if (video.src) video.pause();
    }), { rootMargin: '200px 0px', threshold: 0 }).observe(video);
  }

  /* ---------- Animations pilotées par le défilement ---------- */
  const hero = $('#hero'), heroBa = $('#heroBa'), heroCopy = $('#heroCopy'), heroPromise = $('#heroPromise'),
        hint = $('#scrollHint'), top = $('#top'), bar = $('#progress'),
        steps = $('#etapes'), track = $('#stepsTrack'), stepCards = $$('.step'),
        marquee = $('[data-marquee]'), grow = $('[data-grow]'), parallax = $$('[data-parallax]');
  let ticking = false;

  function update() {
    ticking = false;
    const vh = innerHeight, y = scrollY, max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;

    const hr = hero.getBoundingClientRect();
    top.classList.toggle('solid', hr.bottom < 70);
    if (reduce) return;

    // héros : la lumière « entre » dans la pièce, léger travelling avant
    if (hr.bottom > 0) {
      const p = clamp(-hr.top / Math.max(1, hr.height - vh));
      if (!heroBa._ba.drag) heroBa._ba.set(100 - 90 * ease(clamp(p / .7)));
      heroBa.style.setProperty('--z', (1 + .12 * p).toFixed(4));
      const out = clamp((p - .28) / .22);
      heroCopy.style.opacity = 1 - out;
      heroCopy.style.translate = `0 ${-40 * out}px`;
      heroCopy.style.visibility = out >= 1 ? 'hidden' : 'visible';
      const inn = clamp((p - .6) / .2);
      heroPromise.style.opacity = inn;
      heroPromise.style.translate = `0 ${30 * (1 - inn)}px`;
      hint.style.opacity = 1 - clamp(p / .06);
    }

    // étapes : les cartes défilent à l'horizontale
    const sr = steps.getBoundingClientRect();
    if (sr.top < vh && sr.bottom > 0) {
      const p = clamp(-sr.top / Math.max(1, sr.height - vh));
      const travel = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform = `translate3d(${-travel * p}px,0,0)`;
      const active = Math.min(stepCards.length - 1, Math.floor(p * stepCards.length));
      stepCards.forEach((c, i) => c.classList.toggle('on', i <= active && sr.top <= vh * .5));
    }

    // bande de mots
    if (marquee) {
      const loop = marquee.scrollWidth / 3;
      marquee.style.transform = `translate3d(${-((y * .35) % loop)}px,0,0)`;
    }

    // vidéo qui grandit en entrant
    if (grow) {
      const r = grow.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) grow.style.setProperty('--g', (.8 + .2 * ease(clamp((vh - r.top) / (vh * .75)))).toFixed(4));
    }

    // légendes en léger décalage
    parallax.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * +el.dataset.parallax).toFixed(1)}px`;
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (reduce) heroBa._ba.set(50);
  update();

  /* ---------- Langues : FR dans la page, NL / DE / EN dans /i18n ---------- */
  const ATTRS = [['data-i18n', (el, v) => { el.innerHTML = v; }, el => el.innerHTML],
                 ['data-i18n-alt', (el, v) => { el.alt = v; }, el => el.alt],
                 ['data-i18n-aria', (el, v) => { el.setAttribute('aria-label', v); }, el => el.getAttribute('aria-label')]];
  const dict = { fr: { 'meta.title': document.title } };
  ATTRS.forEach(([a, , get]) => $$(`[${a}]`).forEach(el => { dict.fr[el.getAttribute(a)] = get(el); }));
  const LANGS = ['fr', 'nl', 'de', 'en'];

  async function setLang(l, save) {
    if (!LANGS.includes(l)) return;
    if (!dict[l]) {
      try { const r = await fetch(`i18n/${l}.json`); if (!r.ok) throw 0; dict[l] = await r.json(); }
      catch (_) { return; }
    }
    const d = dict[l];
    ATTRS.forEach(([a, set]) => $$(`[${a}]`).forEach(el => {
      const k = el.getAttribute(a); set(el, d[k] != null ? d[k] : dict.fr[k]);
    }));
    document.documentElement.lang = l;
    document.title = d['meta.title'] || dict.fr['meta.title'];
    $$('.langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    if (save) try { localStorage.setItem('lang', l); } catch (_) {}
    onScroll();
  }
  $$('.langs button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, true)));
  let start = new URLSearchParams(location.search).get('lang');
  if (!start) try { start = localStorage.getItem('lang'); } catch (_) {}
  if (start && start !== 'fr') setLang(start, false);
})();
