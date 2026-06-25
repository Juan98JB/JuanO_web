document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'webjuan_cards';
  const ADMIN_HASH = '77473b09a7543e9fa3caba8e6afb9ace3d8dcbac027c0c2af39f628fbce4cc25';

  /* ============================================
     Admin mode — oculta edición a visitantes
     ============================================ */
  function isAdmin() {
    return sessionStorage.getItem('webjuan_admin') === 'true';
  }

  function applyGearVisibility() {
    const show = isAdmin();
    document.querySelectorAll('.gear').forEach(g => g.style.display = show ? '' : 'none');
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) exportBtn.style.display = show ? '' : 'none';
  }

  async function sha256(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function loginAdmin() {
    const pass = prompt('Ingresa la contraseña de administrador:');
    if (pass !== null) {
      const hash = await sha256(pass);
      if (hash === ADMIN_HASH) {
        sessionStorage.setItem('webjuan_admin', 'true');
        applyGearVisibility();
        return true;
      } else {
        alert('Contraseña incorrecta.');
      }
    }
    return false;
  }

  function logoutAdmin() {
    sessionStorage.removeItem('webjuan_admin');
    applyGearVisibility();
  }

  applyGearVisibility();

  // Click en brand → ir a inicio. Doble clic → admin login
  const brandTrigger = document.querySelector('.navbar__brand');
  let brandClickTimer = null;
  if (brandTrigger) {
    brandTrigger.addEventListener('click', (e) => {
      clearTimeout(brandClickTimer);
      brandClickTimer = setTimeout(() => {
        showPage('novedades');
      }, 250);
    });
    brandTrigger.addEventListener('dblclick', (e) => {
      e.preventDefault();
      clearTimeout(brandClickTimer);
      if (isAdmin()) {
        if (confirm('¿Cerrar sesión de administrador?')) logoutAdmin();
      } else {
        loginAdmin();
      }
    });
  }

  /* ============================================
     SPA: Page Navigation
     ============================================ */
  function showPage(pageId, mode, topic) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (link) link.classList.add('active');

    const activeMode = mode || 'notas';
    page?.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    const modeTab = page?.querySelector(`.mode-tab[data-mode="${activeMode}"]`);
    if (modeTab) modeTab.classList.add('active');
    page?.querySelectorAll('.subject-mode').forEach(m => m.classList.remove('active'));
    const modeContent = page?.querySelector(`.subject-mode[data-mode="${activeMode}"]`);
    if (modeContent) modeContent.classList.add('active');

    document.querySelectorAll('.subject-nav__menu a').forEach(a => a.classList.remove('active-topic'));
    document.querySelectorAll('.subject-note-card, .subject-featured__card').forEach(c => c.classList.remove('active-topic'));

    if (topic) {
      const topicLink = document.querySelector(`.subject-nav__menu a[data-topic="${topic}"]`);
      if (topicLink) topicLink.classList.add('active-topic');

      const noteCard = document.querySelector(`.subject-note-card[data-id="${topic}"], .subject-featured__card[data-id="${topic}"]`);
      if (noteCard) {
        noteCard.classList.add('active-topic');
        noteCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const cat = noteCard.dataset.category;
        if (cat) {
          const page = noteCard.closest('.page');
          page.querySelectorAll('.subject-category').forEach(el => el.classList.remove('active'));
          const catEl = page.querySelector(`.subject-category[data-category="${cat}"]`);
          if (catEl) catEl.classList.add('active');
          const pageId = page.id.replace('page-', '');
          filterSubjectNotes(pageId);
        }
      }
    }
  }

  function parseHash() {
    const hash = window.location.hash.slice(1);
    if (hash.includes('/')) {
      const parts = hash.split('/');
      if (parts.length >= 2 && (parts[1] === 'notas' || parts[1] === 'ejercicios')) {
        return { page: parts[0], mode: parts[1], topic: parts.slice(2).join('/') || null };
      }
      return { page: parts[0], mode: null, topic: parts.slice(1).join('/') || null };
    }
    return { page: hash, mode: null, topic: null };
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      showPage(page);
      window.history.replaceState(null, '', `#${page}`);
    });
  });

  document.addEventListener('click', (e) => {
    const topicLink = e.target.closest('.subject-nav__menu a');
    if (topicLink) {
      e.preventDefault();
      const topic = topicLink.dataset.topic;
      const page = topicLink.closest('.page').id.replace('page-', '');
      const activeModeTab = topicLink.closest('.page')?.querySelector('.mode-tab.active');
      const mode = activeModeTab?.dataset.mode || 'notas';
      showPage(page, mode, topic);
      window.history.replaceState(null, '', `#${page}/${mode}/${topic}`);
    }
  });

  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      const page = tab.closest('.page');
      const pageId = page.id.replace('page-', '');
      let activeTopic = page.querySelector('.subject-nav__menu a.active-topic');
      let topic = activeTopic?.dataset.topic;
      if (!topic) {
        const activeCard = page.querySelector('.subject-note-card.active-topic, .subject-featured__card.active-topic');
        topic = activeCard?.dataset.id;
      }
      showPage(pageId, mode, topic);
      const hash = topic ? `#${pageId}/${mode}/${topic}` : `#${pageId}/${mode}`;
      window.history.replaceState(null, '', hash);
    });
  });

  const { page: initialPage, mode: initialMode, topic: initialTopic } = parseHash();
  showPage(initialPage || 'novedades', initialMode, initialTopic);

  /* ============================================
     Data Fetch & Subject Cards
     ============================================ */
  const DATA = {};

  const MATH_DATA = {
    basicas: [
      { id: 'teoria-de-conjuntos', title: 'Teor\u00eda de Conjuntos', icon: '\u2282', desc: 'Conjuntos, operaciones, relaciones y funciones.' },
      { id: 'algebra', title: '\u00c1lgebra (Elemental y Lineal)', icon: '\u2395', desc: 'Vectores, matrices, espacios vectoriales y transformaciones.' },
      { id: 'calculo', title: 'C\u00e1lculo', icon: '\u222b', desc: 'L\u00edmites, derivadas, integrales y aplicaciones.' },
      { id: 'geometria', title: 'Geometr\u00eda Elemental y Anal\u00edtica', icon: '\u25b3', desc: 'Geometr\u00eda euclidiana, coordenadas y secciones c\u00f3nicas.' },
      { id: 'intro-edo', title: 'Intro. a las Ecuaciones Diferenciales', icon: '\u2202', desc: 'EDO, m\u00e9todos de soluci\u00f3n y aplicaciones.' },
      { id: 'intro-variable-compleja', title: 'Intro. a la Variable Compleja', icon: '\u2102', desc: 'N\u00fameros complejos, funciones anal\u00edticas e integraci\u00f3n.' }
    ],
    avanzadas: [
      { id: 'analisis-real', title: 'An\u00e1lisis Real', icon: '\u211d', desc: 'Sucesiones, continuidad, diferenciaci\u00f3n e integraci\u00f3n de Riemann.' },
      { id: 'teoria-de-la-medida', title: 'Teor\u00eda de la Medida', icon: '\u03bc', desc: 'Medida, integraci\u00f3n de Lebesgue y espacios de medida.' },
      { id: 'analisis-complejo', title: 'An\u00e1lisis Complejo', icon: '\u210b', desc: 'Funciones holomorfas, series de Laurent y teorema de residuos.' },
      { id: 'topologia', title: 'Topolog\u00eda', icon: '\u221e', desc: 'Espacios topol\u00f3gicos, continuidad, compacidad y conexidad.' },
      { id: 'geometria-diferencial', title: 'Geometr\u00eda Diferencial', icon: '\u03b3', desc: 'Variedades, tensores, curvatura y conexiones.' },
      { id: 'edo-cualitativa', title: 'Ecuaciones Diferenciales (Teor\u00eda Cualitativa)', icon: '\u2202', desc: 'Sistemas din\u00e1micos, estabilidad y bifurcaciones.' },
      { id: 'analisis-funcional', title: 'An\u00e1lisis Funcional', icon: '\u2113', desc: 'Espacios de Banach, Hilbert y operadores lineales.' }
    ],
    aplicadas: [
      { id: 'matematicas-discretas', title: 'Matem\u00e1ticas Discretas', icon: '\u2261', desc: 'Combinatoria, grafos, recursi\u00f3n y estructuras discretas.' },
      { id: 'optimizacion', title: 'Optimizaci\u00f3n (Prog. Lineal y No Lineal)', icon: '\u2197', desc: 'Programaci\u00f3n lineal, convexa y m\u00e9todos num\u00e9ricos.' },
      { id: 'io', title: 'Investigaci\u00f3n de Operaciones', icon: '\u25c6', desc: 'Modelado, simulaci\u00f3n y optimizaci\u00f3n de sistemas.' },
      { id: 'probabilidad-y-estadistica', title: 'Probabilidad y Estad\u00edstica', icon: '\u03c3', desc: 'Distribuciones, inferencia, pruebas de hip\u00f3tesis y regresi\u00f3n.' }
    ]
  };

  const PHY_DATA = {
    clasica: [
      { id: 'mecanica-newtoniana', title: 'Mec\u00e1nica Newtoniana', icon: '\u2699', desc: 'Leyes de Newton, energ\u00eda, momento y movimiento.' },
      { id: 'electromagnetismo', title: 'Electromagnetismo (Ecuaciones de Maxwell)', icon: '\u2b29', desc: 'Campos el\u00e9ctrico y magn\u00e9tico, ondas electromagn\u00e9ticas.' },
      { id: 'termodinamica', title: 'Termodin\u00e1mica y Mec\u00e1nica Estad\u00edstica', icon: '\u0394', desc: 'Leyes de la termodin\u00e1mica, entrop\u00eda y ensambles.' },
      { id: 'optica-y-ondas', title: '\u00d3ptica y Ondas', icon: '\u2360', desc: 'Ondas mec\u00e1nicas y electromagn\u00e9ticas, \u00f3ptica geom\u00e9trica y f\u00edsica.' },
      { id: 'fluidos', title: 'Fluidos', icon: '\u224f', desc: 'Hidrost\u00e1tica, hidrodin\u00e1mica, ecuaci\u00f3n de Bernoulli.' },
      { id: 'mecanica-de-materiales', title: 'Mec\u00e1nica de Materiales', icon: '\u2194', desc: 'Elasticidad, esfuerzo, deformaci\u00f3n y resistencia de materiales.' }
    ],
    moderna: [
      { id: 'relatividad', title: 'Relatividad (Especial y General)', icon: '\u20f0', desc: 'Transformaciones de Lorentz, curvatura del espacio-tiempo.' },
      { id: 'mecanica-cuantica', title: 'Mec\u00e1nica Cu\u00e1ntica', icon: '\u210f', desc: 'Ecuaci\u00f3n de Schr\u00f6dinger, \u00e1tomos y part\u00edculas.' },
      { id: 'particulas-y-campos', title: 'F\u00edsica de Part\u00edculas y Campos', icon: '\u2a02', desc: 'Modelo est\u00e1ndar, cuarks, leptones y campos cu\u00e1nticos.' },
      { id: 'materia-condensada', title: 'Materia Condensada', icon: '\u2b25', desc: 'S\u00f3lidos, semiconductores, superconductividad y magnetismo.' }
    ],
    matematica: [
      { id: 'lagrangiana-hamiltoniana', title: 'Formulaci\u00f3n Lagrangiana y Hamiltoniana', icon: '\u2112', desc: 'Geometr\u00eda simpl\u00e9ctica, corchetes de Poisson.' },
      { id: 'metodos-matematicos', title: 'M\u00e9todos Matem\u00e1ticos de la F\u00edsica', icon: '\u210b', desc: 'Espacios de Hilbert y operadores lineales.' },
      { id: 'teoria-de-grupos', title: 'Teor\u00eda de Grupos en F\u00edsica', icon: '\u2295', desc: 'Grupos de Lie y simetr\u00edas en f\u00edsica.' },
      { id: 'sistemas-dinamicos', title: 'Sistemas Din\u00e1micos y Caos', icon: '\u221e', desc: 'Ecuaciones no lineales, atractores y teor\u00eda del caos.' }
    ]
  };

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function countItems(data) {
    let total = 0;
    Object.keys(data).forEach(cat => { total += data[cat].length; });
    return { total, cats: Object.keys(data).length };
  }

  function updateSubjectStats(pageId, data) {
    const { total, cats } = countItems(data);
    const stats = document.getElementById(`${pageId}-stats`);
    if (!stats) return;
    const notas = stats.querySelector(`#${pageId}-stat-notas`);
    const ejercicios = stats.querySelector(`#${pageId}-stat-ejercicios`);
    const categorias = stats.querySelector(`#${pageId}-stat-categorias`);
    if (notas) notas.textContent = total;
    if (ejercicios) ejercicios.textContent = total;
    if (categorias) categorias.textContent = cats;
  }

  function renderSubjectContent(pageId, data) {
    const page = document.getElementById(`page-${pageId}`);
    if (!page) return;

    function buildCards(items, isFeatured) {
      return items.map(item => {
        const icon = escapeHtml(item.icon);
        const title = escapeHtml(item.title);
        const desc = escapeHtml(item.desc);
        if (isFeatured) {
          return `
            <div class="subject-featured__card" data-id="${item.id}" data-category="${item.cat}">
              <div class="subject-featured__icon">${icon}</div>
              <div class="subject-featured__info">
                <h4>${title}</h4>
                <p>${desc}</p>
              </div>
            </div>`;
        }
        return `
          <div class="subject-note-card" data-id="${item.id}" data-category="${item.cat}">
            <div class="subject-note-card__icon">${icon}</div>
            <h4>${title}</h4>
            <p>${desc}</p>
            <span class="subject-note-card__action">Abrir &rarr;</span>
          </div>`;
      }).join('');
    }

    const allItems = [];
    Object.keys(data).forEach(cat => {
      data[cat].forEach(item => {
        allItems.push({ ...item, cat });
      });
    });

    ['notas', 'ejercicios'].forEach(mode => {
      const featured = document.getElementById(`${pageId}-featured-${mode}`);
      const notes = document.getElementById(`${pageId}-notes-${mode}`);
      if (featured) {
        const featuredItems = allItems.slice(0, 3);
        featured.innerHTML = buildCards(featuredItems, true);
      }
      if (notes) {
        const shuffled = [...allItems].sort(() => Math.random() - 0.5);
        notes.innerHTML = buildCards(shuffled, false);
      }
    });

    updateSubjectStats(pageId, data);
  }

  function filterSubjectNotes(pageId) {
    const page = document.getElementById(`page-${pageId}`);
    const cards = page.querySelectorAll('.subject-note-card, .subject-featured__card');
    const catEls = page.querySelectorAll('.subject-category');
    const active = page.querySelector('.subject-category.active');
    const category = active ? active.dataset.category : null;

    cards.forEach(card => {
      card.style.display = (!category || card.dataset.category === category) ? '' : 'none';
    });
  }

  function renderSubjectCards() {
    const local = loadLocalData();
    document.querySelectorAll('.subject-grid').forEach(grid => {
      const category = grid.dataset.category;
      const items = DATA[category];
      if (!items) return;
      grid.innerHTML = items.map(item => {
        const saved = local[item.id] || {};
        const title = saved.title || item.title;
        const desc = saved.desc || item.desc;
        const content = saved.content || item.content || '';
        const gradient = saved.gradient || item.gradient;
        const icon = item.icon || '';
        return `
          <div class="subcard subject-subcard" data-id="${item.id}" data-category="${category}"
               data-title="${escapeHtml(title)}" data-desc="${escapeHtml(desc)}"
               data-content="${escapeHtml(content)}" data-gradient="${escapeHtml(gradient)}">
            <div class="card-inner">
              <div class="card-front" style="background: ${gradient};">
                <span class="gear">&#9881;</span>
                <span class="subject-icon">${escapeHtml(icon)}</span>
                <h3 class="card-title">${escapeHtml(title)}</h3>
                <p class="card-desc">${escapeHtml(desc)}</p>
              </div>
              <div class="card-back">
                <form class="card-form">
                  <label>T&iacute;tulo <input type="text" class="title-input" value="${escapeHtml(title)}"></label>
                  <label>Descripci&oacute;n <input type="text" class="desc-input" value="${escapeHtml(desc)}"></label>
                  <label>Contenido <textarea class="content-input" rows="4">${escapeHtml(content)}</textarea></label>
                  <button type="button" class="save-btn">Guardar</button>
                </form>
              </div>
            </div>
          </div>
        `;
      }).join('');
    });
  }

  function cardBg(saved, item) {
    const imgUrl = saved.imageUrl || (item && item.imageUrl);
    if (imgUrl) {
      const o = saved.opacity != null ? saved.opacity : 1;
      const overlay = Math.round((1 - o) * 0.6 * 100) / 100;
      const bg = `url(${imgUrl}) center / cover no-repeat`;
      return overlay > 0 ? `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), ${bg}` : bg;
    }
    return saved.gradient || (item && item.gradient) || '';
  }

  function renderNovedadesCards() {
    const container = document.getElementById('novedades-cards');
    if (!container) return;
    const local = loadLocalData();
    const categories = [
      { key: 'proyectos' },
      { key: 'notas' },
      { key: 'ejercicios' },
      { key: 'divulgacion' }
    ];
    container.innerHTML = categories.map((cat, idx) => {
      const items = DATA[cat.key] || [];
      return `
        <div class="section-cards ${idx === 0 ? 'active' : ''}" data-index="${idx}">
          ${items.map(item => {
            const saved = local[item.id] || {};
            const title = saved.title || item.title || '';
            const desc = saved.desc || item.desc || '';
            const url = saved.url || item.url || '';
            return `
              <div class="subcard" data-id="${item.id}" data-title="${escapeHtml(title)}"
                   data-url="${escapeHtml(url)}" data-desc="${escapeHtml(desc)}">
                <div class="card-inner">
                  <div class="card-front" style="background: ${cardBg(saved, item)};">
                    <span class="gear">&#9881;</span>
                    <h3 class="card-title">${escapeHtml(title)}</h3>
                    <p class="card-desc">${escapeHtml(desc)}</p>
                  </div>
                  <div class="card-back">
                    <form class="card-form">
                      <label>Imagen <input type="file" accept="image/*"></label>
                      <label>T&iacute;tulo <input type="text" class="title-input" value="${escapeHtml(title)}"></label>
                      <label>Desc <input type="text" class="desc-input" value="${escapeHtml(desc)}"></label>
                      <label>URL <input type="url" class="url-input" value="${escapeHtml(url)}" placeholder="https://..."></label>
                      <label>URL Imagen <input type="url" class="image-url-input" value="${escapeHtml(saved.imageUrl || '')}" placeholder="https://..."></label>
                      <label>Opacidad <input type="range" min="0" max="1" step="0.1" value="${saved.opacity != null ? saved.opacity : 1}" class="opacity-input"></label>
                      <button type="button" class="save-btn">Guardar</button>
                    </form>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
  }

  function syncHardcodedCards() {
    const local = loadLocalData();
    document.querySelectorAll('.reading-grid .subcard, .card-grid .subcard').forEach(card => {
      const id = card.dataset.id;
      if (!id) return;
      let item = null;
      for (const arr of Object.values(DATA)) {
        if (Array.isArray(arr)) { item = arr.find(i => i.id === id); if (item) break; }
      }
      if (!item) return;
      const saved = local[id] || {};
      const title = saved.title || item.title;
      const desc = saved.desc || item.desc;
      const url = saved.url || item.url;
      const imgUrl = saved.imageUrl || item.imageUrl;
      const opacity = saved.opacity != null ? saved.opacity : (item.opacity != null ? item.opacity : 1);
      const titleEl = card.querySelector('.card-title');
      const descEl = card.querySelector('.card-front .card-desc');
      const front = card.querySelector('.card-front');
      if (titleEl && title) titleEl.textContent = title;
      if (descEl && desc) descEl.textContent = desc;
      if (url) card.dataset.url = url;
      if (front) {
        if (imgUrl) {
          applyBgWithOpacity(front, `url(${imgUrl})`, opacity);
        } else if (item.gradient) {
          front.style.background = item.gradient;
        }
      }
    });
  }

  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      Object.assign(DATA, data);
      renderSubjectCards();
      renderNovedadesCards();
      syncHardcodedCards();
      renderSubjectContent('matematicas', MATH_DATA);
      renderSubjectContent('fisica', PHY_DATA);
      applyGearVisibility();
    })
    .catch(() => {});

  /* ============================================
     Modal
     ============================================ */
  const modal = document.getElementById('content-modal');
  const modalTitle = modal.querySelector('.modal-title');
  const modalBody = modal.querySelector('.modal-body');

  function openModal(title, content) {
    modalTitle.textContent = title;
    modalBody.textContent = content;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  /* ============================================
     Helpers
     ============================================ */
  function loadLocalData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveLocalData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function cardId(cardEl) {
    return cardEl.dataset.id || 'card_' + (Array.from(document.querySelectorAll('.subcard')).indexOf(cardEl));
  }

  function applyBgWithOpacity(front, bgUrl, opacity) {
    const o = opacity != null ? opacity : 1;
    const overlay = Math.round((1 - o) * 0.6 * 100) / 100;
    if (overlay > 0) {
      front.style.background = `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), ${bgUrl} center / cover no-repeat`;
    } else {
      front.style.background = `${bgUrl} center / cover no-repeat`;
    }
  }

  /* ============================================
     Restore saved data on page load
     ============================================ */
  const localData = loadLocalData();
  document.querySelectorAll('.subcard').forEach(card => {
    const id = cardId(card);
    const saved = localData[id];
    if (saved) {
      const front = card.querySelector('.card-front');
      const titleEl = card.querySelector('.card-title');
      const descEl = card.querySelector('.card-front .card-desc');
      const titleInput = card.querySelector('.title-input');
      const descInput = card.querySelector('.desc-input');
      const urlInput = card.querySelector('.url-input');
      const imageUrlInput = card.querySelector('.image-url-input');
      const opacitySlider = card.querySelector('.opacity-input');

      // Limpiar bg de servidor anterior (no disponible en GitHub Pages)
      if (saved.bg && saved.bg.startsWith('/images/')) {
        delete saved.bg;
      }

      if (saved.title !== undefined) {
        if (titleEl) titleEl.textContent = saved.title;
        if (titleInput) titleInput.value = saved.title;
        card.dataset.title = saved.title;
      }
      if (saved.desc !== undefined) {
        if (descEl) descEl.textContent = saved.desc;
        if (descInput) descInput.value = saved.desc;
        card.dataset.desc = saved.desc;
      }
      if (saved.url !== undefined) {
        card.dataset.url = saved.url;
        if (urlInput) urlInput.value = saved.url;
      }
      if (saved.imageUrl !== undefined) {
        if (imageUrlInput) imageUrlInput.value = saved.imageUrl;
        if (front) {
          if (!card.dataset.origBg) card.dataset.origBg = front.style.background;
          const opacity = saved.opacity != null ? saved.opacity : 1;
          applyBgWithOpacity(front, `url(${saved.imageUrl})`, opacity);
          if (opacitySlider) opacitySlider.value = opacity;
        }
      } else if (saved.bg && front) {
        if (!card.dataset.origBg) card.dataset.origBg = front.style.background;
        const opacity = saved.opacity != null ? saved.opacity : 1;
        applyBgWithOpacity(front, saved.bg, opacity);
        if (opacitySlider) opacitySlider.value = opacity;
      } else if (saved.opacity != null && opacitySlider) {
        opacitySlider.value = saved.opacity;
      }

      // Subject card extra fields
      if (card.classList.contains('subject-subcard')) {
        const contentInput = card.querySelector('.content-input');
        if (saved.content !== undefined) {
          if (contentInput) contentInput.value = saved.content;
          card.dataset.content = saved.content;
        }
        if (saved.gradient !== undefined && front) {
          front.style.background = saved.gradient;
          card.dataset.gradient = saved.gradient;
        }
      }
    }
  });

  /* ============================================
     Inject editable fields into card forms
     ============================================ */
  document.querySelectorAll('.card-form').forEach(form => {
    if (form.querySelector('.title-input')) return;
    const card = form.closest('.subcard');

    const descLabel = form.querySelector('.desc-input').parentElement;
    descLabel.insertAdjacentHTML('beforebegin',
      `<label>Título <input type="text" class="title-input" value="${(card.dataset.title || '').replace(/"/g, '&quot;')}"></label>`
    );

    const urlLabel = form.querySelector('.url-input').parentElement;
    urlLabel.insertAdjacentHTML('afterend',
      `<label>URL Imagen <input type="url" class="image-url-input" placeholder="https://..." value="${(card.dataset.imageUrl || '').replace(/"/g, '&quot;')}"></label>`
    );
  });

  // Apply saved data to newly injected inputs (from localStorage restore)
  const localData2 = loadLocalData();
  document.querySelectorAll('.card-form').forEach(form => {
    const card = form.closest('.subcard');
    if (!card) return;
    const id = cardId(card);
    const saved = localData2[id];
    if (!saved) return;
    const titleInput = form.querySelector('.title-input');
    const imageUrlInput = form.querySelector('.image-url-input');
    if (titleInput && saved.title !== undefined) titleInput.value = saved.title;
    if (imageUrlInput && saved.imageUrl !== undefined) imageUrlInput.value = saved.imageUrl;
  });

  /* ============================================
     Tab Switching
     ============================================ */
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = tab.dataset.index;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.section-cards').forEach(s => s.classList.remove('active'));
      const target = document.querySelector(`.section-cards[data-index="${idx}"]`);
      if (target) target.classList.add('active');
    });
  });

  /* ============================================
     Dark Mode Toggle
     ============================================ */
  const themeBtn = document.querySelector('.theme-toggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  /* ============================================
     Unified click handling (gear, save, navigate)
     ============================================ */
  const GH_OWNER = 'Juan98JB';
  const GH_REPO = 'JuanO_web';
  const GH_BRANCH = 'main';

  async function exportData() {
    const local = loadLocalData();
    const merged = {};
    for (const [key, items] of Object.entries(DATA)) {
      merged[key] = items.map(item => {
        const saved = local[item.id];
        if (!saved) return { ...item };
        const result = { ...item };
        if (saved.title !== undefined) result.title = saved.title;
        if (saved.desc !== undefined) result.desc = saved.desc;
        if (saved.url !== undefined) result.url = saved.url;
        if (saved.content !== undefined) result.content = saved.content;
        if (saved.gradient !== undefined) result.gradient = saved.gradient;
        if (saved.imageUrl !== undefined) result.imageUrl = saved.imageUrl;
        if (saved.opacity !== undefined) result.opacity = saved.opacity;
        return result;
      });
    }
    const content = JSON.stringify(merged, null, 2);

    let token = sessionStorage.getItem('gh_token');
    if (!token) {
      token = prompt('Ingresa tu token de GitHub (Settings → Developer settings → Personal access tokens → Fine-grained tokens, permiso "Contents: write"):');
      if (!token) return;
      sessionStorage.setItem('gh_token', token);
    }

    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) exportBtn.textContent = 'Subiendo...';

    try {
      // 1. Get current file to obtain SHA
      const getUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/data.json?ref=${GH_BRANCH}`;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (!getRes.ok && getRes.status !== 404) throw new Error(`Error al obtener el archivo: ${getRes.status}`);
      const sha = getRes.ok ? (await getRes.json()).sha : null;

      // 2. Push new content
      const putUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/data.json`;
      const putBody = {
        message: 'Actualizar data.json desde admin panel',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: GH_BRANCH
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody)
      });
      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || `Error al subir: ${putRes.status}`);
      }

      alert('data.json actualizado en GitHub. Los cambios se verán en ~1-2 minutos.');
    } catch (err) {
      alert('Error: ' + err.message);
      if (err.message.includes('Bad credentials') || err.message.includes('401')) {
        sessionStorage.removeItem('gh_token');
      }
    } finally {
      if (exportBtn) exportBtn.textContent = 'Exportar data.json';
    }
  }

  document.addEventListener('click', (e) => {
    const target = e.target;

    // 0 - Export button
    if (target.closest('.export-btn')) {
      exportData();
      return;
    }

    // 1 - Gear click → toggle flip
    const gear = target.closest('.gear');
    if (gear) {
      e.stopPropagation();
      const card = gear.closest('.subcard');
      if (!card) return;
      const wasFlipped = card.classList.contains('flipped');
      card.classList.toggle('flipped');
      if (wasFlipped) {
        try { resetForm(card); } catch (err) { console.warn('resetForm error:', err); }
      }
      return;
    }

    // 2 - Save button → save data
    const saveBtn = target.closest('.save-btn');
    if (saveBtn) {
      e.stopPropagation();
      const card = saveBtn.closest('.subcard');
      if (!card) return;

      const titleInput = card.querySelector('.title-input');
      const descInput = card.querySelector('.desc-input');
      const urlInput = card.querySelector('.url-input');
      const imageUrlInput = card.querySelector('.image-url-input');
      const opacitySlider = card.querySelector('.opacity-input');
      const titleEl = card.querySelector('.card-title');
      const descEl = card.querySelector('.card-front .card-desc');
      const front = card.querySelector('.card-front');

      const newTitle = titleInput ? titleInput.value.trim() : '';
      const newDesc = descInput ? descInput.value.trim() : '';
      const newUrl = urlInput ? urlInput.value.trim() : '';
      let newImageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';
      if (!newImageUrl && card.dataset.previewBg) {
        const m = card.dataset.previewBg.match(/^url\(["']?(data:.+?)["']?\)$/);
        if (m) {
          newImageUrl = m[1];
          const sizeKB = Math.round(newImageUrl.length * 0.75 / 1024);
          if (sizeKB > 500 && !confirm(`La imagen pesa ~${sizeKB} KB. Se guardar\u00e1 en data.json como base64 y har\u00e1 el archivo m\u00e1s pesado.\n\n\u00bfSubir de todas formas?`)) {
            return;
          }
        }
      }
      const newOpacity = opacitySlider ? parseFloat(opacitySlider.value) : 1;

      if (titleEl) titleEl.textContent = newTitle;
      if (descEl) descEl.textContent = newDesc;
      card.dataset.title = newTitle;
      card.dataset.desc = newDesc;
      card.dataset.url = newUrl;

      const id = cardId(card);
      const local = loadLocalData();
      if (!local[id]) local[id] = {};
      local[id].title = newTitle;
      local[id].desc = newDesc;
      local[id].url = newUrl;
      local[id].opacity = newOpacity;

      // Save imageUrl only if user provided one (typed URL or uploaded file)
      if (newImageUrl) {
        local[id].imageUrl = newImageUrl;
        if (!card.dataset.previewBg) {
          if (!card.dataset.origBg) card.dataset.origBg = front.style.background;
          applyBgWithOpacity(front, `url(${newImageUrl})`, newOpacity);
        }
      } else if (!card.dataset.previewBg && card.dataset.origBg) {
        front.style.background = card.dataset.origBg;
      }

      // Subject card extra fields
      if (card.classList.contains('subject-subcard')) {
        const contentInput = card.querySelector('.content-input');
        if (contentInput) {
          const newContent = contentInput.value.trim();
          local[id].content = newContent;
          card.dataset.content = newContent;
        }
      }

      saveLocalData(local);

      card.classList.remove('flipped');
      return;
    }

    // 3 - Subject subcard → open modal (non-flipped, non-gear)
    const subjectCard = target.closest('.subject-subcard');
    if (subjectCard && !subjectCard.classList.contains('flipped') && !target.closest('.gear')) {
      const id = subjectCard.dataset.id;
      const local = loadLocalData();
      const saved = local[id];
      const title = (saved && saved.title) || subjectCard.dataset.title || '';
      const content = (saved && saved.content) || subjectCard.dataset.content || '';
      if (content) {
        openModal(title, content);
      }
      return;
    }

    // 3b - Subject category card → filter notes
    const subjCat = target.closest('.subject-category');
    if (subjCat) {
      const category = subjCat.dataset.category;
      const page = subjCat.closest('.page');
      const pageId = page.id.replace('page-', '');
      page.querySelectorAll('.subject-category').forEach(el => el.classList.remove('active'));
      subjCat.classList.add('active');
      filterSubjectNotes(pageId);
      const activeModeTab = page.querySelector('.mode-tab.active');
      const mode = activeModeTab?.dataset.mode || 'notas';
      window.history.replaceState(null, '', `#${pageId}/${mode}`);
      return;
    }

    // 3c - Subject note card → open modal
    const noteCard = target.closest('.subject-note-card, .subject-featured__card');
    if (noteCard && !target.closest('.gear')) {
      const id = noteCard.dataset.id;
      const page = noteCard.closest('.page');
      const pageId = page.id.replace('page-', '');
      const data = pageId === 'matematicas' ? MATH_DATA : (pageId === 'fisica' ? PHY_DATA : null);
      if (!data) return;
      let item = null;
      for (const catKey of Object.keys(data)) {
        item = data[catKey].find(i => i.id === id);
        if (item) break;
      }
      if (item) {
        openModal(item.title, item.desc + '\n\nContenido pendiente...');
        const activeModeTab = page.querySelector('.mode-tab.active');
        const mode = activeModeTab?.dataset.mode || 'notas';
        page.querySelectorAll('.subject-note-card, .subject-featured__card').forEach(c => c.classList.remove('active-topic'));
        noteCard.classList.add('active-topic');
        window.history.replaceState(null, '', `#${pageId}/${mode}/${id}`);
      }
      return;
    }

    // 4 - Card front → navigate to URL (only when NOT flipped)
    const subcard = target.closest('.subcard');
    if (subcard && !subcard.classList.contains('flipped')) {
      const url = subcard.dataset.url;
      if (url && url.trim() !== '') {
        window.open(url.trim(), '_blank', 'noopener,noreferrer');
      }
    }
  });

  /* ============================================
     File input preview
     ============================================ */
  document.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="file"]');
    if (!input) return;
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const card = input.closest('.subcard');
      if (!card) return;
      const front = card.querySelector('.card-front');
      const opacitySlider = card.querySelector('.opacity-input');
      const opacity = opacitySlider ? parseFloat(opacitySlider.value) : 1;
      const bgUrl = `url(${ev.target.result})`;
      if (!card.dataset.origBg) card.dataset.origBg = front.style.background;
      card.dataset.previewBg = bgUrl;
      applyBgWithOpacity(front, bgUrl, opacity);
    };
    reader.readAsDataURL(file);
  });

  /* ============================================
     Subject Page — Search
     ============================================ */
  function setupSubjectSearch(inputId, pageId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      const page = document.getElementById(`page-${pageId}`);
      const cards = page.querySelectorAll('.subject-note-card, .subject-featured__card');
      const hasQuery = query.length > 0;
      cards.forEach(card => {
        const title = card.querySelector('h4')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('p')?.textContent?.toLowerCase() || '';
        const match = title.includes(query) || desc.includes(query);
        card.style.display = (!hasQuery || match) ? '' : 'none';
      });
      if (!hasQuery) {
        page.querySelectorAll('.subject-category').forEach(el => el.classList.remove('active'));
        filterSubjectNotes(pageId);
      }
    });
  }

  setupSubjectSearch('math-search-input', 'matematicas');
  setupSubjectSearch('phy-search-input', 'fisica');

  /* ============================================
     Opacity slider
     ============================================ */
  document.addEventListener('input', (e) => {
    const slider = e.target.closest('.opacity-input');
    if (!slider) return;
    const card = slider.closest('.subcard');
    if (!card) return;
    const front = card.querySelector('.card-front');
    const opacity = parseFloat(slider.value);
    const local = loadLocalData();
    const id = cardId(card);
    const imgUrl = local[id] && local[id].imageUrl;
    const bg = card.dataset.previewBg || (imgUrl ? `url(${imgUrl})` : (local[id] && local[id].bg));
    if (bg) {
      applyBgWithOpacity(front, bg, opacity);
    }
    if (!local[id]) local[id] = {};
    local[id].opacity = opacity;
    saveLocalData(local);
  });

  /* ============================================
     Escape to close flip
     ============================================ */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.querySelectorAll('.subcard.flipped').forEach(card => {
        resetForm(card);
        card.classList.remove('flipped');
      });
    }
  });

  /* ============================================
     Reset form to original data
     ============================================ */
  function resetForm(card) {
    const local = loadLocalData();
    const id = cardId(card);
    const data = local[id] || findOriginalData(id);
    if (!data) return;
    const titleInput = card.querySelector('.title-input');
    const descInput = card.querySelector('.desc-input');
    const urlInput = card.querySelector('.url-input');
    const imageUrlInput = card.querySelector('.image-url-input');
    const opacitySlider = card.querySelector('.opacity-input');
    const titleEl = card.querySelector('.card-title');
    const front = card.querySelector('.card-front');
    if (titleInput) titleInput.value = data.title || '';
    if (descInput) descInput.value = data.desc || '';
    if (urlInput) urlInput.value = data.url || '';
    if (imageUrlInput) imageUrlInput.value = data.imageUrl || '';
    if (opacitySlider) opacitySlider.value = data.opacity != null ? data.opacity : 1;
    if (titleEl) titleEl.textContent = data.title || card.dataset.title || '';
    if (data.imageUrl && front) {
      if (!card.dataset.origBg) card.dataset.origBg = front.style.background;
      applyBgWithOpacity(front, `url(${data.imageUrl})`, data.opacity || 1);
    } else if (data.bg && front) {
      applyBgWithOpacity(front, data.bg, data.opacity || 1);
    } else if (card.dataset.origBg && front) {
      front.style.background = card.dataset.origBg;
    } else {
      const orig = findOriginalData(id);
      if (orig && orig.gradient && front) {
        front.style.background = orig.gradient;
      }
    }
    // Subject card extra fields
    if (card.classList.contains('subject-subcard')) {
      const contentInput = card.querySelector('.content-input');
      if (contentInput) contentInput.value = data.content || card.dataset.content || '';
      const g = data.gradient || card.dataset.gradient;
      if (g && front) {
        front.style.background = g;
      }
    }

    card.dataset.previewBg = '';
    const fileInput = card.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  }

  function findOriginalData(id) {
    // Try regular subcard (in DOM)
    const div = document.querySelector(`.subcard[data-id="${id}"]:not(.subject-subcard)`);
    if (div) {
      return {
        title: div.dataset.title || '',
        desc: div.dataset.desc || '',
        url: div.dataset.url || '',
        opacity: 1
      };
    }
    // Try subject card from DATA
    for (const cat of Object.keys(DATA)) {
      const items = DATA[cat];
      if (Array.isArray(items)) {
        const item = items.find(i => i.id === id);
        if (item) {
          return {
            title: item.title || '',
            desc: item.desc || '',
            content: item.content || '',
            gradient: item.gradient || '',
            opacity: 1
          };
        }
      }
    }
    return null;
  }

});
