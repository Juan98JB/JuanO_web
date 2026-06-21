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
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (link) link.classList.add('active');
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      showPage(page);
      window.history.replaceState(null, '', `#${page}`);
    });
  });

  const initialPage = window.location.hash.slice(1) || 'novedades';
  showPage(initialPage);

  /* ============================================
     Data Fetch & Subject Cards
     ============================================ */
  const DATA = {};

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
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

  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      Object.assign(DATA, data);
      renderSubjectCards();
      renderNovedadesCards();
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
