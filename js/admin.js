/**
 * @file admin.js
 * @description AURA Administration Module.
 * 
 * Cumple con:
 * - ISO/IEC 25010: Calidad de producto (Mantenibilidad y Fiabilidad).
 * - ISO/IEC 27001: Gestión de Seguridad de la Información (Autenticación Robusta).
 * - ISO/IEC 27034: Seguridad en aplicaciones (Control de acceso y CSP).
 */
"use strict";

(() => {
  /* ══════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════ */
  const PANELS = {
    dashboard: 'panelDashboard',
    products: 'panelProducts',
    settings: 'panelSettings',
    reviews: 'panelReviews',
    orders: 'panelOrders',
    sales: 'panelSales',
    suggestions: 'panelSuggestions'
  };
  const TITLES = {
    dashboard: 'Dashboard',
    products: 'Productos',
    settings: 'Ajustes',
    reviews: 'Reseñas',
    orders: 'Pedidos',
    sales: 'Ventas',
    suggestions: 'Sugerencias'
  };

  let elements = {};
  let editingId = null;
  let editingReviewId = null;
  let allProducts = [];
  let allReviews = [];
  let allOrders = [];
  let allSuggestions = [];
  let uploadedImageData = null;

  /**
   * Caché de elementos del DOM para optimizar el rendimiento
   */
  const initElements = () => {
    elements = {
      loginScreen: document.getElementById('loginScreen'),
      loginForm: document.getElementById('loginForm'),
      loginError: document.getElementById('loginError'),
      sidebar: document.querySelector('.sidebar'),
      menuToggle: document.getElementById('menuToggle'),
      topbarTitle: document.getElementById('topbarTitle'),
      themeToggle: document.getElementById('themeToggle'),
      btnLogout: document.getElementById('btnLogout'),
      // Dashboard Stats
      statTotalSales: document.getElementById('statTotalSales'),
      statOrders: document.getElementById('statOrders'),
      statReviews: document.getElementById('statReviews'),
      statProducts: document.getElementById('statProducts'),
      statAvg: document.getElementById('statAvg'),
      statTotal: document.getElementById('statTotal'),
      statMax: document.getElementById('statMax'),
      // Dashboard Elements
      activityFeed: document.getElementById('activityFeed'),
      topProducts: document.getElementById('topProducts'),
      // Modal
      modalOverlay: document.getElementById('modalOverlay'),
      modalTitle: document.getElementById('modalTitle'),
      // Tablas
      productsTable: document.querySelector('#panelProducts tbody'),
      ordersTable: document.querySelector('#panelOrders tbody'),
      reviewsTable: document.getElementById('reviewsTable'),
      suggestionsTable: document.querySelector('#panelSuggestions tbody'),
      salesTable: document.getElementById('salesTable'),
      // Sales stats
      salesTotalRevenue: document.getElementById('salesTotalRevenue'),
      salesTotalOrders: document.getElementById('salesTotalOrders'),
      salesAvgTicket: document.getElementById('salesAvgTicket'),
      // Settings
      settingName: document.getElementById('settingName'),
      settingCurrency: document.getElementById('settingCurrency'),
      settingShipping: document.getElementById('settingShipping'),
      settingPhone: document.getElementById('settingPhone'),
      settingAbout: document.getElementById('settingAbout'),
      // Paneles y Nav
      panels: document.querySelectorAll('.panel'),
      navItems: document.querySelectorAll('.nav-item'),
      // UI Status
      dbStatus: document.getElementById('dbStatus'),
      dbStatusText: document.getElementById('dbStatusText'),
      currentDate: document.getElementById('currentDate'),
      // Search & Filters
      searchProducts: document.getElementById('searchProducts'),
      filterCategory: document.getElementById('filterCategory'),
      productCount: document.getElementById('productCount'),
      // Product Form Elements
      fId: document.getElementById('fId'),
      fName: document.getElementById('fName'),
      fCategory: document.getElementById('fCategory'),
      fDesc: document.getElementById('fDesc'),
      fPrice: document.getElementById('fPrice'),
      fOldPrice: document.getElementById('fOldPrice'),
      fBadge: document.getElementById('fBadge'),
      fImage: document.getElementById('fImage'),
      fImageFile: document.getElementById('fImageFile'),
      fImageAlt: document.getElementById('fImageAlt'),
      imagePreview: document.getElementById('imagePreview'),
      imageUploadZone: document.getElementById('imageUploadZone'),
      // Review Form Elements
      rAuthor: document.getElementById('rAuthor'),
      rRating: document.getElementById('rRating'),
      rText: document.getElementById('rText'),
      editReviewId: document.getElementById('editReviewId'),
      reviewModalTitle: document.getElementById('reviewModalTitle'),
      reviewModalOverlay: document.getElementById('reviewModalOverlay'),
      // Order Modal
      orderModalTitle: document.getElementById('orderModalTitle'),
      orderModalBody: document.getElementById('orderModalBody'),
      orderModalOverlay: document.getElementById('orderModalOverlay'),
    };
  };

  /* ══════════════════════════════════════════════
     PANEL NAVIGATION
  ══════════════════════════════════════════════ */
  const showPanel = (key) => {
    Object.values(PANELS).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(PANELS[key]);
    if (target) target.classList.add('active');

    if (elements.topbarTitle) elements.topbarTitle.textContent = TITLES[key] || key;

    if (elements.navItems) {
      elements.navItems.forEach(btn =>
        btn.classList.toggle('active', btn.dataset.panel === key)
      );
    }

    if (key === 'products') renderTable(
      elements.searchProducts?.value || '',
      elements.filterCategory?.value || ''
    );
    if (key === 'dashboard') renderDashboard();
    if (key === 'reviews') renderReviewsTable();
    if (key === 'orders') renderOrdersTable(document.getElementById('ordersFilterStatus')?.value || '');
    if (key === 'sales') renderSalesDashboard();
    if (key === 'suggestions') renderSuggestionsTable();
  };

  /* ══════════════════════════════════════════════
     DB STATUS & UI HELPERS
  ══════════════════════════════════════════════ */
  const setDbStatus = (online) => {
    const { dbStatus, dbStatusText } = elements;
    if (!dbStatus || !dbStatusText) return;
    dbStatus.className = `db-status ${online ? 'online' : 'offline'}`;
    dbStatusText.textContent = online ? 'Firebase conectado' : 'Solo local';
  };

  /* ══════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════ */
  const updateStats = () => {
    const products = auraStore.getProducts();
    const prices = products.map(p => parseFloat(p.price)).filter(v => !isNaN(v));
    const total = prices.reduce((s, v) => s + v, 0);
    const avg = prices.length ? total / prices.length : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    if (elements.statProducts) elements.statProducts.textContent = products.length;
    if (elements.statAvg) elements.statAvg.textContent = '$' + avg.toFixed(2);
    if (elements.statTotal) elements.statTotal.textContent = '$' + total.toFixed(2);
    if (elements.statMax) elements.statMax.textContent = '$' + max.toFixed(2);
  };

  const setDate = () => {
    const el = elements.currentDate;
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const updateThemeIcon = (theme) => {
    if (elements.themeToggle) {
      elements.themeToggle.innerHTML = theme === 'dark' ? auraStore.icons.sun : auraStore.icons.moon;
    }
  };

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  const renderDashboard = () => {
    updateStats();
    updatePendingBadge();
    const products = auraStore.getProducts();

    if (elements.activityFeed) {
      const items = [
        { text: 'Panel de administración activo', time: 'Ahora' },
        { text: `Catálogo con ${products.length} producto${products.length !== 1 ? 's' : ''}`, time: 'Actualizado' },
        { text: 'Sistema de sincronización listo', time: 'Online' },
      ];
      elements.activityFeed.innerHTML = items.map(a => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <span class="activity-text">${a.text}</span>
          <span class="activity-time">${a.time}</span>
        </div>`).join('');
    }

    if (elements.topProducts) {
      if (!products.length) {
        elements.topProducts.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">Sin productos aún.</p>';
      } else {
        const sorted = [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 4);
        elements.topProducts.innerHTML = sorted.map(p => `
          <div class="top-product-item">
            <span class="tp-icon" aria-hidden="true">${auraStore.renderImage(p.image)}</span>
            <span class="tp-name">${auraStore.escapeHTML(p.name)}</span>
            <span class="tp-price">$${parseFloat(p.price).toFixed(2)}</span>
          </div>`).join('');
      }
    }
  };

  /* ══════════════════════════════════════════════
     PRODUCTS TABLE (Read)
  ══════════════════════════════════════════════ */
  const renderTable = (searchQuery = '', filterCategory = '') => {
    const tbody = elements.productsTable;
    const countEl = elements.productCount;
    if (!tbody) return;

    const products = auraStore.getProducts();
    const query = searchQuery.toLowerCase();

    const filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      const matchesCat = !filterCategory || p.category === filterCategory;
      return matchesSearch && matchesCat;
    });

    allProducts = products; // Sync local cache

    if (countEl) countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><span>📦</span>No se encontraron productos.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      // Determinar qué mostrar como miniatura
      let thumbContent = auraStore.renderImage(p.image);

      return `
      <tr data-id="${p.id}">
        <td><div class="td-thumb-wrapper">${thumbContent}</div></td>
        <td>
          <div class="td-name">${auraStore.escapeHTML(p.name)}</div>
          <div class="td-sku" style="font-size:0.65rem; color:var(--muted); font-family:'DM Sans', sans-serif;">ID: ${p.id}</div>
        </td>
        <td><span class="td-badge" style="background:var(--cream); padding:0.2rem 0.5rem; border-radius:2px; font-size:0.75rem; border:1px solid var(--border);">${auraStore.escapeHTML(p.category || 'General')}</span></td>
        <td style="font-weight: 600;">$${parseFloat(p.price).toFixed(2)}${p.oldPrice ? `<br><del style="font-size:0.75rem;color:var(--muted);font-weight:400;">$${parseFloat(p.oldPrice).toFixed(2)}</del>` : ''}</td>
        <td>${p.badge ? `<span class="badge-pill" style="background:var(--accent);color:white;font-size:0.65rem;padding:0.2rem 0.5rem;border-radius:2px;letter-spacing:0.05em;">${auraStore.escapeHTML(p.badge)}</span>` : '-'}</td>
        <td class="td-actions">
          <button class="btn-edit" data-action="edit" title="Editar" aria-label="Editar producto">✏</button>
          <button class="btn-delete" data-action="delete" title="Eliminar" aria-label="Eliminar producto">🗑</button>
        </td>
      </tr>
    `}).join('');

    // Rebuild category filter options
    populateCategoryFilter();
    updateStats();
  };

  const populateCategoryFilter = () => {
    const sel = elements.filterCategory;
    if (!sel) return;
    const current = sel.value;
    const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = current;

    // Also update datalist in modal
    const dl = document.getElementById('categoryList');
    if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  };

  /* ══════════════════════════════════════════════
     MODAL (Create / Update)
  ══════════════════════════════════════════════ */
  const showImagePreview = (src) => {
    const preview = elements.imagePreview;
    if (!preview) return;
    if (src && (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://'))) {
      const safeSrc = src.startsWith('data:') ? src : auraStore.escapeHTML(src);
      preview.innerHTML = `<img src="${safeSrc}" alt="Preview" /><button class="remove-img" type="button" title="Quitar imagen">✕</button>`;
      preview.classList.add('has-image');
      preview.querySelector('.remove-img')?.addEventListener('click', clearUploadedImage);
    } else if (src) {
      preview.innerHTML = `<span class="emoji-preview">${auraStore.escapeHTML(src)}</span><button class="remove-img" type="button" title="Quitar">✕</button>`;
      preview.classList.add('has-image');
      preview.querySelector('.remove-img')?.addEventListener('click', clearUploadedImage);
    } else {
      preview.innerHTML = '';
      preview.classList.remove('has-image');
    }
  };

  const clearUploadedImage = () => {
    uploadedImageData = null;
    if (elements.fImage) elements.fImage.value = '';
    if (elements.fImageFile) elements.fImageFile.value = '';
    showImagePreview(null);
    if (elements.imageUploadZone) elements.imageUploadZone.style.display = '';
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      auraStore.showToast('Solo se permiten archivos de imagen', 'error');
      return;
    }
    // Limit size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      auraStore.showToast('La imagen no debe superar 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImageData = e.target.result;
      if (elements.fImage) elements.fImage.value = uploadedImageData;
      showImagePreview(uploadedImageData);
      if (elements.imageUploadZone) elements.imageUploadZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  };

  const openModal = (product = null) => {
    editingId = product ? product.id : null;
    uploadedImageData = null;

    if (elements.modalTitle) elements.modalTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';

    if (elements.fId) {
      elements.fId.value = product?.id || '';
      elements.fId.readOnly = !!product;
      elements.fId.style.opacity = product ? '0.6' : '1';
    }

    if (elements.fName) elements.fName.value = product?.name || '';
    if (elements.fCategory) elements.fCategory.value = product?.category || '';
    if (elements.fDesc) elements.fDesc.value = product?.description || '';
    if (elements.fPrice) elements.fPrice.value = product?.price || '';
    if (elements.fOldPrice) elements.fOldPrice.value = product?.oldPrice || '';
    if (elements.fBadge) elements.fBadge.value = product?.badge || '';

    if (elements.fImageFile) elements.fImageFile.value = '';
    const zone = elements.imageUploadZone;

    // Determine what to show for the image
    const img = product?.image || '';
    if (img && (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://'))) {
      if (elements.fImage) elements.fImage.value = img;
      if (elements.fImageAlt) elements.fImageAlt.value = '';
      if (img.startsWith('data:')) uploadedImageData = img;
      showImagePreview(img);
      if (zone) zone.style.display = 'none';
    } else {
      if (elements.fImage) elements.fImage.value = '';
      if (elements.fImageAlt) elements.fImageAlt.value = img;
      showImagePreview(img || null);
      if (zone) zone.style.display = '';
    }

    if (elements.modalOverlay) elements.modalOverlay.classList.add('open');
    if (elements.fName) elements.fName.focus();
  };

  const closeModal = () => {
    if (elements.modalOverlay) elements.modalOverlay.classList.remove('open');
    editingId = null;
  };

  /* ══════════════════════════════════════════════
     PARSE HELPERS
  ══════════════════════════════════════════════ */
  const parsePrice = (val) => {
    if (!val && val !== 0) return null;
    const parsed = parseFloat(val.toString().replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  };

  /* ══════════════════════════════════════════════
     CREATE / UPDATE
  ══════════════════════════════════════════════ */
  const saveProduct = async () => {
    let inputId = elements.fId?.value.trim().toUpperCase() || '';
    const name = elements.fName?.value.trim();
    const price = parsePrice(elements.fPrice?.value);
    const oldPrice = parsePrice(elements.fOldPrice?.value);

    if (!inputId) { auraStore.showToast('El ID del producto es obligatorio', 'error'); return; }
    if (!name) { auraStore.showToast('El nombre es obligatorio', 'error'); return; }
    if (price === null || price < 0) { auraStore.showToast('Precio inválido', 'error'); return; }

    const wasEditing = !!editingId;
    const products = auraStore.getProducts();

    if (!wasEditing && products.some(p => p.id === inputId)) {
      auraStore.showToast(`Error: El ID "${inputId}" ya existe`, 'error');
      return;
    }

    let imageVal = uploadedImageData || elements.fImage?.value.trim() || elements.fImageAlt?.value.trim() || '📦';

    // Compress if it's a base64 image
    if (imageVal && imageVal.startsWith('data:image/')) {
      imageVal = await auraStore.compressImage(imageVal);
    }

    const newProduct = {
      id: wasEditing ? editingId : inputId,
      name,
      category: elements.fCategory?.value.trim() || 'General',
      description: elements.fDesc?.value.trim(),
      price,
      ...(oldPrice !== null && oldPrice > 0 ? { oldPrice } : {}),
      image: imageVal,
      badge: elements.fBadge?.value.trim(),
    };

    if (wasEditing) {
      const idx = products.findIndex(p => p.id === editingId);
      if (idx > -1) products[idx] = newProduct;
      else products.push(newProduct);
    } else {
      products.push(newProduct);
    }

    const ok = await auraStore.saveProducts(products);
    if (ok === false) return; // error ya mostrado por store

    // Sincronizar carrito si es una edición (actualizar precio, etc.)
    if (wasEditing) {
      let cart = auraStore.getCart();
      let cartUpdated = false;
      cart = cart.map(i => {
        if (i.id === newProduct.id) {
          cartUpdated = true;
          return { ...newProduct, quantity: i.quantity };
        }
        return i;
      });
      if (cartUpdated) auraStore.saveCart(cart);
    }

    closeModal();
    renderTable(
      document.getElementById('searchProducts')?.value || '',
      document.getElementById('filterCategory')?.value || ''
    );
    auraStore.showToast(wasEditing ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
  };


  /* ══════════════════════════════════════════════
     DELETE
  ══════════════════════════════════════════════ */
  const deleteProduct = async (id) => {
    const product = allProducts.find(p => p.id === id);
    const name = product ? `"${product.name}"` : 'este producto';
    if (!confirm(`¿Eliminar ${name} permanentemente?`)) return;

    allProducts = allProducts.filter(p => p.id !== id);
    const ok = await auraStore.saveProducts(allProducts);
    if (ok === false) return;

    // Eliminar del carrito si estaba presente
    const cart = auraStore.getCart();
    const newCart = cart.filter(i => i.id !== id);
    if (cart.length !== newCart.length) {
      auraStore.saveCart(newCart);
    }

    renderTable(
      document.getElementById('searchProducts')?.value || '',
      document.getElementById('filterCategory')?.value || ''
    );
    auraStore.showToast('Producto eliminado ✓', 'success');
  };

  /* ══════════════════════════════════════════════
     REVIEWS CRUD
  ══════════════════════════════════════════════ */
  const renderReviewsTable = () => {
    allReviews = auraStore.getReviews();
    const reviews = allReviews;
    const tbody = elements.reviewsTable;
    if (!tbody) return;

    if (!reviews.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="table-empty"><span>💬</span>No hay reseñas aún.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = reviews.map(r => `
      <tr data-id="${r.id}">
        <td style="font-weight: 500;">${auraStore.escapeHTML(r.author)}</td>
        <td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${auraStore.escapeHTML(r.text)}</td>
        <td class="td-actions">
          <button class="btn-edit" data-action="edit-review" title="Editar">✏ Editar</button>
          <button class="btn-danger" data-action="delete-review" title="Eliminar">${auraStore.icons.trash}</button>
        </td>
      </tr>
    `).join('');
  };

  const openReviewModal = (review = null) => {
    editingReviewId = review ? review.id : null;
    if (elements.reviewModalTitle) elements.reviewModalTitle.textContent = review ? 'Editar reseña' : 'Nueva reseña';

    if (elements.rAuthor) elements.rAuthor.value = review?.author || '';
    if (elements.rRating) elements.rRating.value = review?.rating || '5';
    if (elements.rText) elements.rText.value = review?.text || '';

    if (elements.reviewModalOverlay) elements.reviewModalOverlay.classList.add('open');
  };

  const closeReviewModal = () => {
    if (elements.reviewModalOverlay) elements.reviewModalOverlay.classList.remove('open');
    editingReviewId = null;
  };

  const saveReview = async () => {
    const author = elements.rAuthor?.value.trim();
    const rating = parseInt(elements.rRating?.value || '5');
    const text = elements.rText?.value.trim();
    const editId = editingReviewId;

    if (!author || !text) {
      auraStore.showToast('Autor y comentario son obligatorios', 'error');
      return;
    }
    if (rating < 1 || rating > 5) {
      auraStore.showToast('La calificación debe ser entre 1 y 5', 'error');
      return;
    }

    const reviews = [...allReviews];
    const newReview = {
      id: editId || Date.now().toString(),
      author,
      rating,
      text,
      date: new Date().toISOString()
    };

    if (editId) {
      const idx = reviews.findIndex(r => r.id === editId);
      if (idx > -1) reviews[idx] = newReview;
      else reviews.push(newReview);
    } else {
      reviews.push(newReview);
    }

    await auraStore.saveReviews(reviews);
    allReviews = reviews;
    closeReviewModal();
    renderReviewsTable();
    auraStore.showToast(editId ? 'Reseña actualizada ✓' : 'Reseña creada ✓', 'success');
  };

  const deleteReview = async (id) => {
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
    allReviews = allReviews.filter(r => r.id !== id);
    await auraStore.saveReviews(allReviews);
    renderReviewsTable();
    auraStore.showToast('Reseña eliminada ✓', 'success');
  };

  /* ══════════════════════════════════════════════
     ORDERS CRUD
  ══════════════════════════════════════════════ */

  /** Returns a human-readable relative time string */
  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Justo ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHr < 24) return `hace ${diffHr}h`;
    if (diffDay < 7) return `hace ${diffDay}d`;
    return new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  /** Returns urgency level based on how old a pending order is */
  const getUrgencyClass = (dateStr, status) => {
    if (status !== 'Pendiente') return '';
    const diffHr = (new Date() - new Date(dateStr)) / 3600000;
    if (diffHr > 24) return 'order-urgent';
    if (diffHr > 4) return 'order-warning';
    return 'order-new';
  };

  /** Updates the pending orders badge in sidebar */
  const updatePendingBadge = () => {
    const badge = document.getElementById('pendingOrdersBadge');
    if (!badge) return;
    const pending = allOrders.filter(o => o.status === 'Pendiente').length;
    if (pending > 0) {
      badge.textContent = pending;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  };

  const renderOrdersTable = (filterStatus = '') => {
    allOrders = auraStore.getOrders();
    const tbody = elements.ordersTable;
    if (!tbody) return;

    updatePendingBadge();

    // Apply status filter
    const orders = filterStatus 
      ? allOrders.filter(o => o.status === filterStatus)
      : allOrders;

    // Update filter info
    const infoEl = document.getElementById('ordersFilterInfo');
    const pendingCount = allOrders.filter(o => o.status === 'Pendiente').length;
    if (infoEl) {
      infoEl.textContent = `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} · ${allOrders.length} total`;
    }

    if (!orders.length) {
      const emptyMsg = filterStatus 
        ? `No hay pedidos con estado "${filterStatus}".`
        : 'No hay pedidos registrados.';
      tbody.innerHTML = `<tr><td colspan="7"><div class="table-empty"><span>🛒</span>${emptyMsg}</div></td></tr>`;
      return;
    }

    // Sort: Pending orders first (oldest first = FIFO), then completed/cancelled (newest first)
    const sorted = [...orders].sort((a, b) => {
      if (a.status === 'Pendiente' && b.status !== 'Pendiente') return -1;
      if (a.status !== 'Pendiente' && b.status === 'Pendiente') return 1;
      if (a.status === 'Pendiente' && b.status === 'Pendiente') {
        // FIFO: oldest first (by queue number, then by date)
        return (a.queueNumber || 0) - (b.queueNumber || 0);
      }
      // Non-pending: newest first
      return new Date(b.date) - new Date(a.date);
    });

    tbody.innerHTML = sorted.map(o => {
      const dateStr = new Date(o.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const clientName = o.userName || o.userEmail || 'Anónimo';
      const urgency = getUrgencyClass(o.date, o.status);
      const qNum = o.queueNumber || '—';
      const elapsed = timeAgo(o.date);

      const statusColors = {
        'Pendiente': 'background:rgba(243,156,18,0.1); color:#e67e22; border:1px solid rgba(243,156,18,0.2);',
        'Completado': 'background:rgba(45,158,107,0.1); color:#2d9e6b; border:1px solid rgba(45,158,107,0.2);',
        'Cancelado': 'background:rgba(192,57,43,0.1); color:#c0392b; border:1px solid rgba(192,57,43,0.2);'
      };

      return `
      <tr data-id="${o.id}" class="${urgency}">
        <td>
          <span class="queue-number" title="Número de cola">${qNum}</span>
        </td>
        <td>
          <div style="font-weight:600;font-size:0.82rem;letter-spacing:0.02em;">${auraStore.escapeHTML(o.id)}</div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:0.15rem;">${o.items.length} producto${o.items.length !== 1 ? 's' : ''}</div>
        </td>
        <td>
          <div style="font-weight:500;font-size:0.85rem;">${auraStore.escapeHTML(clientName)}</div>
          ${o.userEmail ? `<div style="font-size:0.68rem;color:var(--muted);">${auraStore.escapeHTML(o.userEmail)}</div>` : ''}
        </td>
        <td>
          <div style="font-weight:500;font-size:0.82rem;">${elapsed}</div>
          <div style="font-size:0.65rem;color:var(--muted);" title="${dateStr}">${dateStr}</div>
        </td>
        <td style="font-weight: 600; font-size: 1rem; font-family:'Cormorant Garamond', serif;">$${parseFloat(o.total).toFixed(2)}</td>
        <td>
          <select class="form-input order-status-select" style="padding:0.35rem 0.5rem; font-size:0.78rem; min-width:120px; border-radius:6px; font-weight:600; ${statusColors[o.status] || ''}" data-action="change-status">
            <option value="Pendiente" ${o.status === 'Pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
            <option value="Completado" ${o.status === 'Completado' ? 'selected' : ''}>✅ Completado</option>
            <option value="Cancelado" ${o.status === 'Cancelado' ? 'selected' : ''}>❌ Cancelado</option>
          </select>
        </td>
        <td class="td-actions">
          <button class="btn-edit" data-action="view-order" title="Ver detalles">👁 Ver</button>
          <button class="btn-danger" data-action="delete-order" title="Eliminar">${auraStore.icons.trash}</button>
        </td>
      </tr>
    `}).join('');
  };

  const updateOrderStatus = async (id, status) => {
    const orders = auraStore.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx > -1) {
      orders[idx].status = status;
      await auraStore.saveOrders(orders);
      // Re-render to update sorting, badge, and visual state
      renderOrdersTable(document.getElementById('ordersFilterStatus')?.value || '');
      auraStore.showToast(`Pedido ${status === 'Completado' ? 'completado ✅' : status === 'Cancelado' ? 'cancelado' : 'marcado como pendiente'}`, 'success');
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm('¿Eliminar este pedido permanentemente?')) return;
    const orders = auraStore.getOrders().filter(o => o.id !== id);
    await auraStore.saveOrders(orders);
    renderOrdersTable(document.getElementById('ordersFilterStatus')?.value || '');
    auraStore.showToast('Pedido eliminado ✓', 'success');
  };

  const openOrderModal = (id) => {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    const queueLabel = order.queueNumber ? `Pedido #${order.queueNumber}` : `Pedido ${order.id}`;
    if (elements.orderModalTitle) elements.orderModalTitle.textContent = queueLabel;

    const itemsHtml = order.items.map(i => `
      <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border);">
        <div><strong>${i.quantity}x</strong> ${auraStore.escapeHTML(i.name)} <span style="font-size:0.7rem; color:var(--muted);">(${i.id})</span></div>
        <div>$${(parseFloat(i.price) * i.quantity).toFixed(2)}</div>
      </div>
    `).join('');

    const statusColor = order.status === 'Completado' ? '#2d9e6b' : order.status === 'Cancelado' ? '#c0392b' : '#e67e22';

    if (elements.orderModalBody) {
      elements.orderModalBody.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; padding:1rem; background:var(--cream); border-radius:8px; border:1px solid var(--border);">
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem;">N° de Cola</div>
            <div style="font-size:1.6rem; font-weight:700; font-family:'Cormorant Garamond', serif;">#${order.queueNumber || '—'}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem;">Estado</div>
            <div style="font-size:0.85rem; font-weight:600; color:${statusColor};">${order.status || 'Pendiente'}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem;">Fecha</div>
            <div style="font-size:0.85rem;">${new Date(order.date).toLocaleString('es-CO')}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem;">Tiempo</div>
            <div style="font-size:0.85rem; font-weight:500;">${timeAgo(order.date)}</div>
          </div>
        </div>
        <div style="margin-bottom:1rem;">
          <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem;">Cliente</div>
          <div style="font-weight:500;">${auraStore.escapeHTML(order.userName || 'Anónimo')}</div>
          ${order.userEmail ? `<div style="font-size:0.8rem; color:var(--muted);">${auraStore.escapeHTML(order.userEmail)}</div>` : ''}
        </div>
        <h4 style="margin-bottom: 0.8rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted);">Productos</h4>
        ${itemsHtml}
        <div style="text-align: right; font-size: 1.3rem; font-weight: 600; margin-top: 1rem; font-family:'Cormorant Garamond', serif; color:var(--accent-dark);">
          Total: $${parseFloat(order.total).toFixed(2)}
        </div>
      `;
    }

    if (elements.orderModalOverlay) elements.orderModalOverlay.classList.add('open');
  };

  const closeOrderModal = () => {
    if (elements.orderModalOverlay) elements.orderModalOverlay.classList.remove('open');
  };

  /* ══════════════════════════════════════════════
     SALES DASHBOARD
  ══════════════════════════════════════════════ */
  const renderSalesDashboard = () => {
    const orders = auraStore.getOrders();
    const completed = orders.filter(o => o.status === 'Completado');

    const revenue = completed.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const count = completed.length;
    const avgTicket = count > 0 ? revenue / count : 0;

    if (elements.salesTotalRevenue) elements.salesTotalRevenue.textContent = `$${revenue.toFixed(2)}`;
    if (elements.salesTotalOrders) elements.salesTotalOrders.textContent = count;
    if (elements.salesAvgTicket) elements.salesAvgTicket.textContent = `$${avgTicket.toFixed(2)}`;

    const tbody = elements.salesTable;
    if (!tbody) return;

    if (!completed.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="table-empty"><span>💸</span>No hay ventas registradas aún.</div></td></tr>`;
      return;
    }

    const sorted = [...completed].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(o => {
      const dateStr = new Date(o.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const productsSummary = o.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

      return `
      <tr>
        <td style="font-weight: 500;">${auraStore.escapeHTML(o.id)}</td>
        <td style="font-size: 0.8rem; color: var(--muted);">${dateStr}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;" title="${auraStore.escapeHTML(productsSummary)}">
          ${auraStore.escapeHTML(productsSummary)}
        </td>
        <td style="font-weight: 600; color: var(--accent);">$${parseFloat(o.total).toFixed(2)}</td>
      </tr>
    `}).join('');
  };

  /* ══════════════════════════════════════════════
     SUGGESTIONS CRUD
  ══════════════════════════════════════════════ */
  const renderSuggestionsTable = () => {
    allSuggestions = auraStore.getSuggestions();
    const suggestions = allSuggestions;
    const tbody = elements.suggestionsTable;
    if (!tbody) return;

    if (!suggestions.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><span>💡</span>No hay sugerencias recibidas.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = suggestions.map(s => `
      <tr data-id="${s.id}">
        <td style="font-weight: 500;">${auraStore.escapeHTML(s.name)}</td>
        <td style="font-size: 0.85rem;">${auraStore.escapeHTML(s.email)}</td>
        <td style="font-size: 0.85rem; max-width: 300px;">${auraStore.escapeHTML(s.message)}</td>
        <td style="font-size: 0.75rem; color: var(--muted);">${new Date(s.date).toLocaleDateString()}</td>
        <td>
          <button class="btn-danger" data-action="delete-suggestion" title="Eliminar">${auraStore.icons.trash}</button>
        </td>
      </tr>
    `).join('');
  };

  const deleteSuggestion = async (id) => {
    if (!confirm('¿Eliminar esta sugerencia?')) return;
    const suggestions = auraStore.getSuggestions().filter(s => s.id !== id);
    await auraStore.saveSuggestions(suggestions);
    renderSuggestionsTable();
    auraStore.showToast('Sugerencia eliminada', 'success');
  };


  /* ══════════════════════════════════════════════
     SETTINGS
  ══════════════════════════════════════════════ */
  const loadSettings = () => {
    const s = auraStore.getSettings();
    if (elements.settingName) elements.settingName.value = s.storeName || 'AURA';
    if (elements.settingCurrency) elements.settingCurrency.value = s.currency || 'USD ($)';
    if (elements.settingShipping) elements.settingShipping.value = `$${s.minFreeShipping || 80}`;
    if (elements.settingPhone) elements.settingPhone.value = s.whatsappPhone || '';
    if (elements.settingAbout) elements.settingAbout.value = s.aboutUs || '';
  };

  /* ══════════════════════════════════════════════
     EVENT LISTENERS
  ══════════════════════════════════════════════ */
  const initEvents = () => {

    // ── Sidebar navigation ──
    document.getElementById('sidebarNav')?.addEventListener('click', e => {
      const btn = e.target.closest('.nav-item');
      if (btn?.dataset.panel) showPanel(btn.dataset.panel);
    });

    // ── Dashboard quick actions ──
    document.getElementById('btnGoProducts')?.addEventListener('click', () => showPanel('products'));
    document.getElementById('btnClearProducts')?.addEventListener('click', async () => {
      if (!confirm('¿Borrar TODOS los productos del catálogo? Esta acción no se puede deshacer.')) return;
      const ok = await auraStore.saveProducts([]);
      if (ok === false) return;
      auraStore.saveCart([]); // Limpiar carrito también
      renderDashboard();
      auraStore.showToast('Catálogo limpiado ✓', 'success');
    });

    // ── Products panel ──
    document.getElementById('btnNewProduct')?.addEventListener('click', () => openModal());

    document.getElementById('productsTable')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.closest('tr')?.dataset.id;
      if (!id) return;
      if (btn.dataset.action === 'edit') {
        const p = auraStore.getProducts().find(p => p.id === id);
        if (p) openModal(p);
      } else if (btn.dataset.action === 'delete') {
        deleteProduct(id);
      }
    });

    // ── Search & filter ──
    document.getElementById('searchProducts')?.addEventListener('input', e => {
      renderTable(e.target.value, document.getElementById('filterCategory')?.value || '');
    });
    document.getElementById('filterCategory')?.addEventListener('change', e => {
      renderTable(document.getElementById('searchProducts')?.value || '', e.target.value);
    });

    // ── Modal ──
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelModal')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
    document.getElementById('btnSaveProduct')?.addEventListener('click', saveProduct);

    // ── Review Modal ──
    document.getElementById('btnNewReview')?.addEventListener('click', () => openReviewModal());
    document.getElementById('reviewModalCloseBtn')?.addEventListener('click', closeReviewModal);
    document.getElementById('btnCancelReviewModal')?.addEventListener('click', closeReviewModal);
    document.getElementById('reviewModalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'reviewModalOverlay') closeReviewModal();
    });
    document.getElementById('btnSaveReview')?.addEventListener('click', saveReview);

    document.getElementById('reviewsTable')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.closest('tr')?.dataset.id;
      if (!id) return;
      if (btn.dataset.action === 'edit-review') {
        const r = auraStore.getReviews().find(rev => rev.id === id);
        if (r) openReviewModal(r);
      } else if (btn.dataset.action === 'delete-review') {
        deleteReview(id);
      }
    });

    // ── Orders ──
    document.getElementById('ordersTable')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.closest('tr')?.dataset.id;
      if (!id) return;
      if (btn.dataset.action === 'view-order') {
        openOrderModal(id);
      } else if (btn.dataset.action === 'delete-order') {
        deleteOrder(id);
      }
    });

    document.getElementById('ordersTable')?.addEventListener('change', e => {
      if (e.target.dataset.action === 'change-status') {
        const id = e.target.closest('tr')?.dataset.id;
        if (id) updateOrderStatus(id, e.target.value);
      }
    });

    // ── Orders filter ──
    document.getElementById('ordersFilterStatus')?.addEventListener('change', e => {
      renderOrdersTable(e.target.value);
    });

    document.getElementById('orderModalCloseBtn')?.addEventListener('click', closeOrderModal);
    document.getElementById('btnCancelOrderModal')?.addEventListener('click', closeOrderModal);
    document.getElementById('orderModalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'orderModalOverlay') closeOrderModal();
    });


    // Image file upload
    document.getElementById('fImageFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file);
    });

    // Drag and drop on upload zone
    const uploadZone = document.getElementById('imageUploadZone');
    if (uploadZone) {
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });
      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
      });
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleImageFile(file);
      });
    }

    // Live preview for emoji/URL alt field
    document.getElementById('fImageAlt')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!uploadedImageData) {
        showImagePreview(val || null);
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // ── Settings ──
    document.getElementById('btnSaveSettings')?.addEventListener('click', async () => {
      const settings = {
        storeName: elements.settingName?.value.trim() || 'AURA',
        currency: elements.settingCurrency?.value.trim() || 'USD ($)',
        minFreeShipping: parseFloat((elements.settingShipping?.value || '80').replace('$', '')) || 80,
        whatsappPhone: elements.settingPhone?.value.trim() || '',
        aboutUs: elements.settingAbout?.value.trim() || ''
      };
      await auraStore.saveSettings(settings);
      auraStore.showToast('Ajustes guardados ✓', 'success');
    });

    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('¿Eliminar TODOS los productos y restablecer la tienda? Esta acción no se puede deshacer.')) {
        auraStore.resetAll();
      }
    });

    // ── Suggestions ──
    document.getElementById('suggestionsTable')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action="delete-suggestion"]');
      if (!btn) return;
      const id = btn.closest('tr')?.dataset.id;
      if (id) deleteSuggestion(id);
    });
  };

  /**
   * Inicializa los eventos que deben estar activos siempre (Login/Logout/Tema)
   */
  const initAuthUI = () => {
    // ── Login ──
    elements.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      const btn = e.target.querySelector('button');

      if (!email || !pass) return;

      if (elements.loginError) elements.loginError.textContent = '';
      btn.disabled = true;
      btn.textContent = 'AUTENTICANDO...';

      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        // Reinitialize Firebase for admin session
        auraStore.reinit();
      } catch (error) {
        console.error("Login error:", error);
        btn.disabled = false;
        btn.textContent = 'ACCEDER AL PANEL';

        if (elements.loginError) {
          switch (error.code) {
            case 'auth/operation-not-allowed':
              elements.loginError.textContent = 'Error: Método de Correo/Contraseña no habilitado en Firebase.';
              break;
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              elements.loginError.textContent = 'Correo o contraseña incorrectos.';
              break;
            default:
              elements.loginError.textContent = 'Error: ' + error.message;
          }
        }
      }
    });

    // ── Logout ──
    elements.btnLogout?.addEventListener('click', async () => {
      try {
        auraStore.cleanup();
        await new Promise(r => setTimeout(r, 100));
        await firebase.auth().signOut();
        auraStore.showToast('Sesión cerrada correctamente', 'success');
      } catch (error) {
        console.error("Logout error:", error);
      }
    });

    // ── Theme ──
    elements.themeToggle?.addEventListener('click', () => {
      const next = auraStore.toggleTheme();
      updateThemeIcon(next);
    });

    // ── Mobile Menu ──
    elements.menuToggle?.addEventListener('click', () => {
      elements.sidebar?.classList.toggle('active');
    });

    // Cerrar sidebar al hacer click en un item (móvil)
    elements.navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          elements.sidebar?.classList.remove('active');
        }
      });
    });
  };

  const checkAdmin = () => {
    let authStateDetermined = false;

    firebase.auth().onAuthStateChanged(async (user) => {
      authStateDetermined = true;
      if (user) {
        // ISO 27001 A.8.2: Verificar que el usuario es admin en Firestore
        let isAdmin = false;
        if (window.firebaseDB) {
          try {
            const adminDoc = await window.firebaseDB.collection('admins').doc(user.uid).get();
            isAdmin = adminDoc.exists;
          } catch (e) {
            console.warn('Admin verification failed:', e.message);
            isAdmin = false;
          }
        }

        if (!isAdmin) {
          console.warn('User is not an admin:', user.email);
          if (elements.loginError) {
            elements.loginError.textContent = 'No tienes permisos de administrador.';
          }
          auraStore.cleanup();
          await new Promise(r => setTimeout(r, 100));
          await firebase.auth().signOut();
          return;
        }

        console.log("Admin session active:", user.email);
        elements.loginScreen?.classList.remove('active');

        if (!window.adminInitialized) {
          window.adminInitialized = true;
          await auraStore.init();
          setDate();
          updateThemeIcon(auraStore.getTheme());
          loadSettings();
          renderDashboard();
          initEvents();
          setDbStatus(!!window.firebaseDB);
        }
      } else {
        console.log("No admin session.");
        elements.loginScreen?.classList.add('active');

        const btn = document.querySelector('.login-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ACCEDER AL PANEL';
        }
      }
    });

    setTimeout(() => {
      if (!authStateDetermined) {
        if (elements.loginError) {
          elements.loginError.style.color = '#b59b6d';
          elements.loginError.textContent = 'Verificando conexión con Firebase...';
        }
      }
    }, 4000);
  };

  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */
  const init = () => {
    initElements();
    initAuthUI();
    checkAdmin();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
