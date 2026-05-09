/**
 * @file index.js
 * @description AURA Index (Shop) Module.
 * 
 * Cumple con:
 * - ISO/IEC 25010 (Calidad de producto) para la mantenibilidad.
 * - ISO/IEC 27001 y 27034 (Seguridad) mediante control de sesiones y CSP.
 */
"use strict";
(() => {
  let cart = auraStore.getCart();
  let elements = {};
  let currentUser = null; // Logged-in customer (Firebase Auth user object)
  
  // ISO 27001: Validación por Firebase Auth
  // Admin check verifies against Firestore admins collection
  const isAdmin = () => {
    return firebase.auth().currentUser !== null && window._isAdminUser === true;
  };

  // ── INITIALIZATION ──
  const initElements = () => {
    elements = {
      productsGrid: document.getElementById('productsGrid'),
      cartItems: document.getElementById('cartItems'),
      cartTotal: document.getElementById('cartTotal'),
      cartCount: document.getElementById('cartCount'),
      cartPanel: document.getElementById('cartPanel'),
      overlay: document.getElementById('overlay'),
      marqueeTrack: document.getElementById('marqueeTrack'),
      cartBtn: document.querySelector('.cart-btn'),
      closeCart: document.querySelector('.close-panel'),
      checkoutBtn: document.querySelector('.checkout-btn'),
      aboutBtn: document.getElementById('btnAbout'),
      aboutModal: document.getElementById('aboutModal'),
      closeAbout: document.getElementById('closeAbout'),
      aboutText: document.getElementById('aboutText'),
      themeToggle: document.getElementById('themeToggle'),
      // Admin elements
      adminPanel: document.getElementById('adminPanelInline'),
      adminToggle: document.getElementById('adminToggle'),
      adminDrawer: document.getElementById('adminDrawer'),
      adminDrawerClose: document.getElementById('adminDrawerClose'),
      adminProductForm: document.getElementById('adminProductForm'),
      // User auth elements
      userBtn: document.getElementById('userBtn'),
      userBtnLabel: document.getElementById('userBtnLabel'),
      userIconInner: document.getElementById('userIconInner'),
      userDropdown: document.getElementById('userDropdown'),
      userDropdownName: document.getElementById('userDropdownName'),
      userDropdownEmail: document.getElementById('userDropdownEmail'),
      authModalOverlay: document.getElementById('authModalOverlay'),
      ordersPanel: document.getElementById('ordersPanel'),
      ordersList: document.getElementById('ordersList'),
    };
  };

  // ── CART LOGIC ──
  const saveCart = () => {
    auraStore.saveCart(cart);
    renderCart();
  };

  const renderCart = () => {
    const { cartCount, cartItems, cartTotal } = elements;

    const count = cart.reduce((s, i) => s + i.quantity, 0);
    if (cartCount) cartCount.textContent = count;

    if (!cartItems || !cartTotal) return;

    if (!cart.length) {
      cartItems.innerHTML = `
        <div class="cart-empty">
          <span class="cart-empty-icon" aria-hidden="true">${auraStore.icons.cart}</span>
          <p>Tu carrito está vacío</p>
        </div>`;
      cartTotal.textContent = '$0.00';
      return;
    }

    let total = 0;
    cartItems.innerHTML = cart.map(item => {
      const price = parseFloat(item.price) || 0;
      const sub = price * item.quantity;
      total += sub;
      return `
        <div class="c-item" data-id="${item.id}">
          <div class="c-item-icon" aria-hidden="true">${item.image}</div>
          <div class="c-item-info">
            <div class="c-item-name">${auraStore.escapeHTML(item.name)}</div>
            <div class="c-item-price">$${sub.toFixed(2)}</div>
            <div class="c-item-controls">
              <button class="qty-btn" data-action="decrease" aria-label="Disminuir cantidad">−</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" data-action="increase" aria-label="Aumentar cantidad">+</button>
              <button class="del-btn" data-action="remove" aria-label="Eliminar producto">${auraStore.icons.trash}</button>
            </div>
          </div>
        </div>`;
    }).join('');

    cartTotal.textContent = `$${total.toFixed(2)}`;
  };

  const updateQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
    saveCart();
  };

  const removeItem = (id) => {
    cart = cart.filter(i => i.id !== id);
    saveCart();
  };

  const addToCart = (productId) => {
    const products = auraStore.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    auraStore.showToast(`${product.name} agregado ✓`);
  };

  // ── ACCESSIBILITY ──
  const trapFocus = (e, container) => {
    const focusables = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const toggleCart = () => {
    if (!elements.cartPanel || !elements.overlay) return;
    const isOpen = elements.cartPanel.classList.toggle('open');
    elements.overlay.classList.toggle('open');

    if (isOpen) {
      elements.closeCart?.focus();
      const handler = (e) => trapFocus(e, elements.cartPanel);
      elements.cartPanel._focusHandler = handler;
      document.addEventListener('keydown', handler);
    } else {
      if (elements.cartPanel._focusHandler) {
        document.removeEventListener('keydown', elements.cartPanel._focusHandler);
        delete elements.cartPanel._focusHandler;
      }
      elements.cartBtn?.focus();
    }
  };

  const checkout = async () => {
    if (!cart.length) {
      auraStore.showToast('El carrito está vacío', 'error');
      return;
    }

    // Require user login before checkout
    if (!currentUser) {
      auraStore.showToast('Inicia sesión para finalizar tu compra', 'error');
      toggleCart();
      openAuthModal();
      return;
    }

    const total = cart.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0);

    // Save order with user info
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
      id: orderId,
      items: [...cart],
      total: total,
      date: new Date().toISOString(),
      status: 'Pendiente',
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || currentUser.email.split('@')[0]
    };
    const orders = auraStore.getOrders();
    orders.push(newOrder);
    await auraStore.saveOrders(orders, { awaitSync: true });

    const orderItems = cart.map(i => `- ${i.quantity}x ${i.name} (SKU: ${i.id})`).join('\n');
    const totalText = `\n\nTotal estimado: $${total.toFixed(2)}\nID Pedido: ${orderId}\nCliente: ${currentUser.email}`;
    const msg = `¡Hola! Me gustaría hacer el siguiente pedido:\n\n${orderItems}${totalText}`;
    
    // Open WhatsApp with pre-filled message
    const settings = auraStore.getSettings();
    const phone = settings.whatsappPhone ? settings.whatsappPhone.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    
    auraStore.showToast('Pedido registrado y redirigiendo a WhatsApp... 🎉', 'success');
    cart = [];
    saveCart();
    toggleCart();
  };

  /* ══════════════════════════════════════════════
     USER AUTH SYSTEM
  ══════════════════════════════════════════════ */
  const openAuthModal = () => {
    elements.authModalOverlay?.classList.add('open');
    document.getElementById('authLoginEmail')?.focus();
  };

  const closeAuthModal = () => {
    elements.authModalOverlay?.classList.remove('open');
    document.getElementById('authLoginError').textContent = '';
    document.getElementById('authSignupError').textContent = '';
  };

  const switchAuthTab = (tab) => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('authLoginForm').classList.toggle('active', tab === 'login');
    document.getElementById('authSignupForm').classList.toggle('active', tab === 'signup');
  };

  const updateUserUI = (user) => {
    currentUser = user;
    const btn = elements.userBtn;
    const label = elements.userBtnLabel;
    const icon = elements.userIconInner;
    if (!btn || !label || !icon) return;

    if (user) {
      const name = user.displayName || user.email.split('@')[0];
      const initial = name.charAt(0).toUpperCase();
      btn.classList.add('logged-in');
      label.innerHTML = `<span class="user-name-text">${auraStore.escapeHTML(name)}</span>`;
      icon.textContent = initial;
      icon.style.fontSize = '0.65rem';
      // Update dropdown
      if (elements.userDropdownName) elements.userDropdownName.textContent = name;
      if (elements.userDropdownEmail) elements.userDropdownEmail.textContent = user.email;
    } else {
      btn.classList.remove('logged-in');
      label.textContent = 'Mi cuenta';
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      icon.style.fontSize = '';
      elements.userDropdown?.classList.remove('open');
    }
  };

  const toggleUserDropdown = (e) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    elements.userDropdown?.classList.toggle('open');
  };

  const toggleOrdersPanel = () => {
    const panel = elements.ordersPanel;
    const overlay = elements.overlay;
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open', isOpen);
    if (isOpen) renderUserOrders();
  };

  const renderUserOrders = () => {
    const list = elements.ordersList;
    if (!list || !currentUser) return;

    const allOrders = auraStore.getOrders();
    const myOrders = allOrders.filter(o => o.userId === currentUser.uid)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!myOrders.length) {
      list.innerHTML = `<div class="orders-empty"><span class="orders-empty-icon">📦</span><p>Aún no tienes pedidos</p><p style="font-size:0.8rem;margin-top:0.5rem;">¡Explora nuestro catálogo y haz tu primera compra!</p></div>`;
      return;
    }

    list.innerHTML = myOrders.map(o => {
      const dateStr = new Date(o.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const statusClass = (o.status || 'Pendiente').toLowerCase();
      const itemsHtml = o.items.map(i => `<div class="order-item-row"><span>${i.quantity}x ${auraStore.escapeHTML(i.name)}</span><span>$${(parseFloat(i.price) * i.quantity).toFixed(2)}</span></div>`).join('');
      return `
        <div class="order-card" data-order-id="${o.id}">
          <div class="order-card-header">
            <div><div class="order-card-id">${auraStore.escapeHTML(o.id)}</div><div class="order-card-date">${dateStr}</div></div>
            <span class="order-status ${statusClass}">${o.status || 'Pendiente'}</span>
          </div>
          <div class="order-card-body">${itemsHtml}</div>
          <div class="order-card-total"><span>Total</span><span class="total-value">$${parseFloat(o.total).toFixed(2)}</span></div>
        </div>`;
    }).join('');
  };

  const initAuthEvents = () => {
    // User button click
    elements.userBtn?.addEventListener('click', toggleUserDropdown);

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!elements.userBtn?.contains(e.target)) {
        elements.userDropdown?.classList.remove('open');
      }
    });

    // My Orders button
    document.getElementById('btnMyOrders')?.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.userDropdown?.classList.remove('open');
      toggleOrdersPanel();
    });

    // Close orders panel
    document.getElementById('closeOrdersPanel')?.addEventListener('click', toggleOrdersPanel);

    // Expand/collapse order cards
    elements.ordersList?.addEventListener('click', (e) => {
      const header = e.target.closest('.order-card-header');
      if (header) header.closest('.order-card')?.classList.toggle('expanded');
    });

    // User logout
    document.getElementById('btnUserLogout')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await firebase.auth().signOut();
        auraStore.showToast('Sesión cerrada', 'success');
      } catch (err) { console.error(err); }
    });

    // Auth modal controls
    document.getElementById('authCloseBtn')?.addEventListener('click', closeAuthModal);
    elements.authModalOverlay?.addEventListener('click', (e) => {
      if (e.target === elements.authModalOverlay) closeAuthModal();
    });

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    // Login form
    document.getElementById('authLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authLoginEmail').value.trim();
      const pass = document.getElementById('authLoginPass').value.trim();
      const errEl = document.getElementById('authLoginError');
      const btn = document.getElementById('authLoginBtn');
      if (!email || !pass) return;
      btn.disabled = true; btn.textContent = 'VERIFICANDO...';
      errEl.textContent = '';
      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        closeAuthModal();
        auraStore.showToast('¡Bienvenido de vuelta! ✓', 'success');
      } catch (error) {
        errEl.textContent = error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' ? 'Correo o contraseña incorrectos.' : 'Error: ' + error.message;
      } finally { btn.disabled = false; btn.textContent = 'INICIAR SESIÓN'; }
    });

    // Signup form
    document.getElementById('authSignupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('authSignupName').value.trim();
      const email = document.getElementById('authSignupEmail').value.trim();
      const pass = document.getElementById('authSignupPass').value.trim();
      const errEl = document.getElementById('authSignupError');
      const btn = document.getElementById('authSignupBtn');
      if (!name || !email || !pass) return;
      btn.disabled = true; btn.textContent = 'CREANDO CUENTA...';
      errEl.textContent = '';
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        closeAuthModal();
        auraStore.showToast(`¡Bienvenido, ${name}! Tu cuenta ha sido creada ✓`, 'success');
      } catch (error) {
        const msgs = { 'auth/email-already-in-use': 'Este correo ya está registrado. Intenta iniciar sesión.', 'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.' };
        errEl.textContent = msgs[error.code] || 'Error: ' + error.message;
      } finally { btn.disabled = false; btn.textContent = 'CREAR CUENTA'; }
    });
  };

  const toggleAbout = () => {
    if (!elements.aboutModal) return;
    const settings = auraStore.getSettings();
    if (elements.aboutText) elements.aboutText.textContent = settings.aboutUs;

    const isOpen = elements.aboutModal.classList.toggle('open');
    if (isOpen) {
      elements.closeAbout?.focus();
      const handler = (e) => trapFocus(e, elements.aboutModal);
      elements.aboutModal._focusHandler = handler;
      document.addEventListener('keydown', handler);
    } else {
      if (elements.aboutModal._focusHandler) {
        document.removeEventListener('keydown', elements.aboutModal._focusHandler);
        delete elements.aboutModal._focusHandler;
      }
      elements.aboutBtn?.focus();
    }
  };

  const updateThemeUI = (theme) => {
    if (!elements.themeToggle) return;
    elements.themeToggle.innerHTML = theme === 'dark' ? auraStore.icons.sun : auraStore.icons.moon;
  };

  // ── REVIEWS RENDERING ──
  const renderReviews = () => {
    const reviews = auraStore.getReviews();
    const reviewsSection = document.getElementById('reviews');
    const reviewsGrid = document.getElementById('reviewsGrid');
    
    if (!reviewsSection || !reviewsGrid) return;

    if (!reviews.length) {
      reviewsSection.style.display = 'none';
      return;
    }

    reviewsSection.style.display = 'block';
    reviewsGrid.innerHTML = reviews.map(r => `
      <div class="review-card" style="background:var(--bone); padding: 2rem; border-radius: 6px; border: 1px solid var(--border);">
        <div style="color:var(--accent); font-size:1.2rem; margin-bottom: 1rem; letter-spacing: 2px;">
          ${'★'.repeat(r.rating)}<span style="color:var(--muted); opacity: 0.3;">${'★'.repeat(5 - r.rating)}</span>
        </div>
        <p style="font-size:0.95rem; line-height: 1.6; margin-bottom: 1.5rem; font-style: italic;">"${auraStore.escapeHTML(r.text)}"</p>
        <p style="font-weight: 600; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">— ${auraStore.escapeHTML(r.author)}</p>
      </div>
    `).join('');
  };


  // ── PRODUCT RENDERING ──
  const renderProducts = () => {
    const products = auraStore.getProducts();
    if (!elements.productsGrid) return;

    const admin = isAdmin();

    if (!products.length) {
      elements.productsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;color:var(--muted);">
          <span style="font-size:3rem;display:block;margin-bottom:1rem;">📦</span>
          <p>No hay productos en el catálogo.</p>
          ${admin ? '<p style="margin-top:0.5rem;font-size:0.85rem;">Usa el panel <strong>⚙ Admin</strong> para agregar el primero.</p>' : ''}
        </div>`;
      return;
    }

    elements.productsGrid.innerHTML = products.map(p => {
      const price = parseFloat(p.price) || 0;
      const oldPrice = p.oldPrice ? parseFloat(p.oldPrice) : null;

      return `
        <article class="product-card" data-id="${p.id}">
          ${admin ? `<button class="admin-delete-btn" data-action="admin-delete" title="Eliminar producto">✕</button>` : ''}
          ${p.badge ? `<span class="product-badge ${p.badge.toLowerCase() === 'sale' ? 'sale' : ''}">${auraStore.escapeHTML(p.badge)}</span>` : ''}
          <div class="product-img" aria-hidden="true">${auraStore.renderImage(p.image)}</div>
          <div class="product-body">
            <p class="product-category">${auraStore.escapeHTML(p.category || 'Producto')}</p>
            <h3 class="product-name">${auraStore.escapeHTML(p.name)}</h3>
            <p style="font-size:0.65rem; color:var(--muted); margin-top:-0.2rem; margin-bottom:0.4rem; font-family:'DM Sans', sans-serif;">SKU: <strong style="color:var(--ink);">${auraStore.escapeHTML(p.id)}</strong></p>
            <p class="product-desc">${auraStore.escapeHTML(p.description)}</p>
            <div class="product-footer">
              <div class="product-price">
                $${price.toFixed(2)}
                ${oldPrice && !isNaN(oldPrice) ? `<span class="old-price">$${oldPrice.toFixed(2)}</span>` : ''}
              </div>
              <button class="add-btn" data-action="add">${auraStore.icons.cart} Agregar</button>
            </div>
          </div>
        </article>`;
    }).join('');

    // Update hero stat
    const heroStat = document.querySelector('.hero-stat strong');
    if (heroStat) heroStat.textContent = products.length;
  };

  // ── MARQUEE ──
  const buildMarquee = () => {
    const items = ['Envío gratis +$80', '30 días de garantía', 'Pago seguro', 'Soporte 24/7', 'Nuevos productos', 'Calidad premium'];
    if (!elements.marqueeTrack) return;

    const repeated = [...items, ...items, ...items];
    elements.marqueeTrack.innerHTML = repeated.map((text, i) => `
      <span class="marquee-item">${text}</span>
      ${i < repeated.length - 1 ? '<span class="marquee-dot" aria-hidden="true">✦</span>' : ''}
    `).join('');
  };

  // ── REVEAL ON SCROLL ──
  const initReveals = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  };

  // ── EVENT LISTENERS ──
  const initEventListeners = () => {
    elements.cartBtn?.addEventListener('click', toggleCart);
    elements.closeCart?.addEventListener('click', toggleCart);
    elements.overlay?.addEventListener('click', () => {
      if (elements.ordersPanel?.classList.contains('open')) toggleOrdersPanel();
      else if (elements.cartPanel?.classList.contains('open')) toggleCart();
    });
    elements.checkoutBtn?.addEventListener('click', checkout);
    elements.aboutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleAbout();
    });
    elements.closeAbout?.addEventListener('click', toggleAbout);
    elements.aboutModal?.addEventListener('click', (e) => {
      if (e.target === elements.aboutModal) toggleAbout();
    });

    elements.themeToggle?.addEventListener('click', () => {
      const next = auraStore.toggleTheme();
      updateThemeUI(next);
    });


    elements.cartItems?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.closest('.c-item').dataset.id;
      const action = btn.dataset.action;
      if (action === 'increase') updateQty(id, 1);
      else if (action === 'decrease') updateQty(id, -1);
      else if (action === 'remove') removeItem(id);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.authModalOverlay?.classList.contains('open')) closeAuthModal();
        else if (elements.ordersPanel?.classList.contains('open')) toggleOrdersPanel();
        else if (elements.cartPanel?.classList.contains('open')) toggleCart();
        if (elements.aboutModal?.classList.contains('open')) toggleAbout();
        if (elements.adminDrawer?.classList.contains('open')) elements.adminDrawer.classList.remove('open');
      }
    });

    // ── Admin inline events ──
    elements.adminToggle?.addEventListener('click', () => {
      elements.adminDrawer?.classList.toggle('open');
    });
    elements.adminDrawerClose?.addEventListener('click', () => {
      elements.adminDrawer?.classList.remove('open');
    });

    // ── Admin inline: image upload helpers ──
    let apUploadedImageData = null;

    const apShowPreview = (src) => {
      const preview = document.getElementById('apImagePreview');
      if (!preview) return;
      if (src && (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://'))) {
        const safeSrc = src.startsWith('data:') ? src : auraStore.escapeHTML(src);
        preview.innerHTML = `<img src="${safeSrc}" alt="Preview" onerror="this.outerHTML='<span class=emoji-preview>❌</span>'" /><button class="remove-img" type="button" title="Quitar">✕</button>`;
        preview.classList.add('has-image');
        preview.querySelector('.remove-img')?.addEventListener('click', apClearImage);
      } else if (src) {
        preview.innerHTML = `<span class="emoji-preview">${auraStore.escapeHTML(src)}</span>`;
        preview.classList.add('has-image');
      } else {
        preview.innerHTML = '';
        preview.classList.remove('has-image');
      }
    };

    const apClearImage = () => {
      apUploadedImageData = null;
      const fileInput = document.getElementById('apImageFile');
      if (fileInput) fileInput.value = '';
      document.getElementById('apImageData').value = '';
      apShowPreview(null);
      const zone = document.getElementById('apImageUploadZone');
      if (zone) zone.style.display = '';
    };

    const apHandleImageFile = (file) => {
      if (!file || !file.type.startsWith('image/')) {
        auraStore.showToast('Solo se permiten archivos de imagen', 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        auraStore.showToast('La imagen no debe superar 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        apUploadedImageData = e.target.result;
        document.getElementById('apImageData').value = apUploadedImageData;
        apShowPreview(apUploadedImageData);
        const zone = document.getElementById('apImageUploadZone');
        if (zone) zone.style.display = 'none';
      };
      reader.readAsDataURL(file);
    };

    // Admin: file input change
    document.getElementById('apImageFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) apHandleImageFile(file);
    });

    // Admin: drag and drop on upload zone
    const apUploadZone = document.getElementById('apImageUploadZone');
    if (apUploadZone) {
      apUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        apUploadZone.classList.add('dragover');
      });
      apUploadZone.addEventListener('dragleave', () => {
        apUploadZone.classList.remove('dragover');
      });
      apUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        apUploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) apHandleImageFile(file);
      });
    }

    // Admin: live image preview for emoji/URL field
    document.getElementById('apImageUrl')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!apUploadedImageData) {
        apShowPreview(val || null);
      }
    });

    // Admin: add product via button click
    document.getElementById('adminSubmitBtn')?.addEventListener('click', async () => {
      const inputId = document.getElementById('apId')?.value.trim().toUpperCase() || '';
      const name  = document.getElementById('apName').value.trim();
      const price = parseFloat(document.getElementById('apPrice').value);
      
      if (!inputId) { auraStore.showToast('El ID / SKU es obligatorio', 'error'); return; }
      if (!name || isNaN(price) || price < 0) {
        auraStore.showToast('Nombre y precio son obligatorios', 'error');
        return;
      }

      const products = auraStore.getProducts();
      
      // Duplication check
      if (products.some(p => p.id === inputId)) {
        auraStore.showToast(`Error: El producto con ID "${inputId}" ya está montado`, 'error');
        return;
      }

      const oldPriceVal = parseFloat(document.getElementById('apOldPrice').value);
      let imageVal = apUploadedImageData || document.getElementById('apImageUrl').value.trim();
      
      // Compress if it's a base64 image
      if (imageVal && imageVal.startsWith('data:image/')) {
        imageVal = await auraStore.compressImage(imageVal);
      }
      
      const newProduct = {
        id: inputId,
        name,
        category: document.getElementById('apCategory').value.trim() || 'General',
        description: document.getElementById('apDesc').value.trim(),
        price,
        ...(!isNaN(oldPriceVal) && oldPriceVal > 0 && { oldPrice: oldPriceVal }),
        image: imageVal || '📦',
        badge: document.getElementById('apBadge').value.trim(),
      };
      
      products.push(newProduct);
      const ok = await auraStore.saveProducts(products);
      if (ok === false) return;
      document.getElementById('adminProductForm').reset();
      apUploadedImageData = null;
      apShowPreview(null);
      const zone = document.getElementById('apImageUploadZone');
      if (zone) zone.style.display = '';
      renderProducts();
      auraStore.showToast(`"${name}" agregado ✓`, 'success');
    });

    // Admin: delete product from card
    elements.productsGrid?.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-action="admin-delete"]');
      if (delBtn) {
        const id = delBtn.closest('.product-card')?.dataset.id;
        if (!id) return;
        const product = auraStore.getProducts().find(p => p.id === id);
        if (!confirm(`¿Eliminar "${product?.name || 'producto'}"?`)) return;
        const products = auraStore.getProducts().filter(p => p.id !== id);
        const ok = await auraStore.saveProducts(products);
        if (ok === false) return;
        // Also remove from cart if present
        cart = cart.filter(i => i.id !== id);
        saveCart();
        renderProducts();
        auraStore.showToast('Producto eliminado ✓', 'success');
        return;
      }
      // existing add-to-cart handler
      const addBtn = e.target.closest('[data-action="add"]');
      if (addBtn) {
        const id = addBtn.closest('.product-card')?.dataset.id;
        if (id) addToCart(id);
      }
    });

    // ── Suggestion Form ──
    document.getElementById('suggestionForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('sugName').value.trim();
      const email = document.getElementById('sugEmail').value.trim();
      const message = document.getElementById('sugMessage').value.trim();

      const suggestions = auraStore.getSuggestions();
      suggestions.push({
        id: 'SUG-' + Date.now(),
        name,
        email,
        message,
        date: new Date().toISOString()
      });

      await auraStore.saveSuggestions(suggestions);
      auraStore.showToast('¡Gracias por tu sugerencia! ✓', 'success');
      e.target.reset();
    });
  };

  // ── INITIALIZATION ──
  const init = async () => {
    initElements();
    await auraStore.init();

    // Listen for auth state — handles BOTH admin and user roles
    firebase.auth().onAuthStateChanged(async (user) => {
      // Check if user is admin (by checking Firestore admins collection)
      window._isAdminUser = false;
      if (user && window.firebaseDB) {
        try {
          const adminDoc = await window.firebaseDB.collection('admins').doc(user.uid).get();
          window._isAdminUser = adminDoc.exists;
        } catch (e) { window._isAdminUser = false; }
      }

      // Admin UI
      if (elements.adminPanel) {
        elements.adminPanel.style.display = window._isAdminUser ? 'block' : 'none';
      }
      const loginStatusPanel = document.getElementById('adminPanelLogin');
      if (loginStatusPanel) {
        loginStatusPanel.style.display = window._isAdminUser ? 'block' : 'none';
      }

      // User UI
      updateUserUI(user);
      renderProducts(); // Re-render to show/hide admin delete buttons
    });

    // Main Admin Logout Button
    document.getElementById('btnMainLogout')?.addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        auraStore.showToast('Sesión cerrada', 'success');
      });
    });

    // Inject Icons
    if (elements.cartBtn) {
      const iconSpan = elements.cartBtn.querySelector('.cart-icon');
      if (iconSpan) iconSpan.innerHTML = auraStore.icons.cart;
    }
    if (elements.closeCart) {
      elements.closeCart.innerHTML = auraStore.icons.close;
    }

    updateThemeUI(auraStore.getTheme());

    buildMarquee();
    renderProducts();
    renderReviews();
    renderCart();
    const heroCta = document.querySelector('.hero-cta');
    if (heroCta) {
      heroCta.querySelector('span').innerHTML = auraStore.icons.arrowRight;
    }

    initEventListeners();
    initAuthEvents();
    initReveals();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
