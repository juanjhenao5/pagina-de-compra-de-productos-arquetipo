/**
 * @file store.js
 * @description Módulo central de gestión de estado y persistencia de datos.
 * Implementa directrices de ISO/IEC 25010 (Mantenibilidad y Fiabilidad) 
 * y controles de ISO/IEC 27001 (Seguridad) para el manejo de almacenamiento.
 */
"use strict";

const auraIcons = {
  cart: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
  close: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  star: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  sun: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
  moon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
};

/**
 * AURA Store Module
 * Handles data persistence and shared state (Now with Firebase integration).
 */
const auraStore = (() => {
  let db = null;
  let firebaseActive = false;

  const DEFAULT_PRODUCTS = [];

  const DEFAULT_SETTINGS = {
    storeName: "AURA",
    currency: "USD ($)",
    minFreeShipping: 80,
    whatsappPhone: "573000000000",
    aboutUs: "En AURA, creemos que la tecnología no debe ser solo funcional, sino una extensión de tu personalidad. Seleccionamos productos que combinan minimalismo estético con un rendimiento excepcional. Nuestra misión es elevar tu día a día a través de objetos con alma y propósito."
  };

  const STORAGE_KEYS = {
    PRODUCTS: 'aura_products',
    CART: 'aura_cart',
    SETTINGS: 'aura_settings',
    COOKIES: 'aura_cookies_accepted',
    REVIEWS: 'aura_reviews',
    ORDERS: 'aura_orders',
    SUGGESTIONS: 'aura_suggestions'
  };

  const DATA_VERSION = 'aura_data_v2'; // bump this string to force a one-time cache clear

  const TOAST_TIMEOUT = 2800;

  // ── FIREBASE INITIALIZATION ──
  // firebase-config.js already calls firebase.initializeApp(), firebase.analytics()
  // and firebase.firestore(). We just grab the pre-initialized instances here.
  const initFirebase = () => {
    try {
      if (window.firebaseDB) {
        db = window.firebaseDB;
        firebaseActive = true;
        console.log("%c✦ AURA Store: Firestore connection acquired.", "color: #b59b6d;");
      } else {
        console.warn("Firestore not available. Using LocalStorage only.");
      }
    } catch (e) {
      console.error("[ISO 27001] Firebase init error:", e);
    }
  };

  /**
   * @function syncFromFirebase
   * @description Sincroniza datos desde Firestore SOLO en la primera carga
   * (cuando localStorage no tiene datos). Después, localStorage es la
   * fuente de verdad y saveProducts se encarga de enviar cambios a Firebase.
   */
  const syncFromFirebase = async () => {
    if (!firebaseActive) return;

    // Helper: timeout para evitar que se quede colgado
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase sync timeout')), ms))
    ]);

    try {
      const productsSnapshot = await withTimeout(db.collection('products').get(), 5000);
      const firestoreProducts = productsSnapshot.docs.map(doc => ({ 
        ...doc.data(),
        id: doc.id
      }));

      const localItems = getFromStorage(STORAGE_KEYS.PRODUCTS, []);
      const localMap = new Map(localItems.map(p => [p.id, p]));
      
      // Merge: Keep all Firestore products, but also keep local products that haven't been synced yet
      // For Firestore products, restore local large images if needed
      const mergedProducts = firestoreProducts.map(fp => {
        const lp = localMap.get(fp.id);
        if (lp && fp._localImageOnly && fp.image === '📦' && lp.image && lp.image.startsWith('data:')) {
          fp.image = lp.image;
        }
        return fp;
      });

      // Add products that are only in local (perhaps created while offline)
      const firestoreIds = new Set(firestoreProducts.map(p => p.id));
      localItems.forEach(lp => {
        if (!firestoreIds.has(lp.id)) {
          mergedProducts.push(lp);
        }
      });

      setToStorage(STORAGE_KEYS.PRODUCTS, mergedProducts);
      console.log("✦ Data synchronized with Firestore.");

      // Similar logic for reviews, orders, suggestions...
      const syncCollection = async (colName, storageKey) => {
        try {
          const snapshot = await withTimeout(db.collection(colName).get(), 5000);
          const firestoreData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          const localData = getFromStorage(storageKey, []);
          const firestoreIds = new Set(firestoreData.map(d => d.id));
          
          const merged = [...firestoreData];
          localData.forEach(ld => {
            if (!firestoreIds.has(ld.id)) merged.push(ld);
          });
          
          setToStorage(storageKey, merged);
        } catch (e) {
          console.warn(`Sync for ${colName} failed`, e.message);
        }
      };

      await syncCollection('reviews', STORAGE_KEYS.REVIEWS);
      await syncCollection('orders', STORAGE_KEYS.ORDERS);
      await syncCollection('suggestions', STORAGE_KEYS.SUGGESTIONS);

      const settingsDoc = await withTimeout(db.collection('settings').doc('general').get(), 3000);
      if (settingsDoc.exists) {
        setToStorage(STORAGE_KEYS.SETTINGS, settingsDoc.data());
      }
    } catch (e) {
      console.warn("Firebase sync failed (timeout or error):", e.message);
      if (localStorage.getItem(STORAGE_KEYS.PRODUCTS) === null) {
        setToStorage(STORAGE_KEYS.PRODUCTS, []);
      }
    }
  };

  const getFromStorage = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      const parsed = JSON.parse(stored);
      return (parsed !== null && parsed !== undefined) ? parsed : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  };

  const setToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      if (error.name === 'QuotaExceededError') {
        showToast('Error: Espacio insuficiente en el navegador. Reduce el tamaño de las imágenes.', 'error');
      } else {
        showToast('Error al guardar datos localmente.', 'error');
      }
      return false;
    }
  };

  /**
   * @function compressImage
   * @description Comprime una imagen base64 usando Canvas.
   */
  const compressImage = (base64Str, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) return resolve(base64Str);
      
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const showToast = (msg, type = '') => {
    try {
      let t = document.getElementById('toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
      }

      t.textContent = msg;
      t.className = `toast show ${type}`;
      t.setAttribute('role', 'alert');
      t.setAttribute('aria-live', 'assertive');

      setTimeout(() => {
        t.classList.remove('show');
        t.removeAttribute('role');
      }, TOAST_TIMEOUT);
    } catch (e) {
      console.error("Error showing toast:", e);
    }
  };

  /**
   * @function initCookies
   * @description Maneja el consentimiento de cookies (alineado con ISO/IEC 27701 - Privacidad)
   */
  const initCookies = () => {
    if (localStorage.getItem(STORAGE_KEYS.COOKIES)) return;

    let banner = document.getElementById('cookieBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cookieBanner';
      banner.className = 'cookie-banner';
      banner.innerHTML = `
        <p>Utilizamos cookies para mejorar tu experiencia y analizar nuestro tráfico.</p>
        <button class="cookie-btn" id="acceptCookies">Aceptar</button>
      `;
      document.body.appendChild(banner);
    }

    const btn = document.getElementById('acceptCookies');
    setTimeout(() => banner.classList.add('show'), 1000);

    btn?.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEYS.COOKIES, 'true');
      banner.classList.remove('show');
    });
  };

  const applySettings = () => {
    const settings = getFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const nameElements = document.querySelectorAll('.nav-logo, .footer-logo, .sidebar-logo a');
    nameElements.forEach(el => {
      const span = el.querySelector('span');
      const text = settings.storeName;
      if (span) {
        el.childNodes[0].textContent = text.slice(0, -1);
        span.textContent = text.slice(-1);
      } else {
        el.textContent = text;
      }
    });

    if (document.title.includes('—')) {
      document.title = `${settings.storeName} — ${document.title.split(' — ')[1]}`;
    }
  };

  return {
    getReviews: () => {
      const reviews = getFromStorage(STORAGE_KEYS.REVIEWS, []);
      return reviews.map(r => ({ ...r, id: r.id.toString() }));
    },
    saveReviews: async (reviews) => {
      const normalized = reviews.map(r => ({ ...r, id: r.id.toString() }));
      const previous = getFromStorage(STORAGE_KEYS.REVIEWS, []);
      setToStorage(STORAGE_KEYS.REVIEWS, normalized);

      if (firebaseActive) {
        const withTimeout = (promise, ms) => Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
        ]);

        (async () => {
          try {
            const previousIds = new Set(previous.map(r => r.id.toString()));
            const newIds = new Set(normalized.map(r => r.id));
            const deletedIds = [...previousIds].filter(id => !newIds.has(id));

            const batch = db.batch();
            normalized.forEach(r => {
              const ref = db.collection('reviews').doc(r.id);
              batch.set(ref, r);
            });
            deletedIds.forEach(id => {
              batch.delete(db.collection('reviews').doc(id));
            });
            await withTimeout(batch.commit(), 5000);
          } catch (e) {
            console.warn("Firebase reviews sync failed:", e.message);
          }
        })();
      }
      return true;
    },
    getOrders: () => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS, []);
      return orders.map(o => ({ ...o, id: o.id.toString() }));
    },
    saveOrders: async (orders, { awaitSync = false } = {}) => {
      const normalized = orders.map(o => ({ ...o, id: o.id.toString() }));
      const previous = getFromStorage(STORAGE_KEYS.ORDERS, []);
      setToStorage(STORAGE_KEYS.ORDERS, normalized);

      if (firebaseActive) {
        const withTimeout = (promise, ms) => Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
        ]);

        const doSync = async () => {
          try {
            const previousIds = new Set(previous.map(o => o.id.toString()));
            const newIds = new Set(normalized.map(o => o.id));
            const deletedIds = [...previousIds].filter(id => !newIds.has(id));

            const batch = db.batch();
            normalized.forEach(o => {
              const ref = db.collection('orders').doc(o.id);
              batch.set(ref, o);
            });
            deletedIds.forEach(id => {
              batch.delete(db.collection('orders').doc(id));
            });
            await withTimeout(batch.commit(), 8000);
            console.log('✦ Pedidos sincronizados con Firebase');
          } catch (e) {
            console.warn("Firebase orders sync failed:", e.message);
            showToast('Pedido guardado localmente. Se sincronizará después.', 'error');
          }
        };

        // If awaitSync is true, block until Firebase write completes (for checkout)
        if (awaitSync) {
          await doSync();
        } else {
          doSync(); // fire-and-forget for admin operations
        }
      }
      return true;
    },
    getSuggestions: () => {
      const suggestions = getFromStorage(STORAGE_KEYS.SUGGESTIONS, []);
      return suggestions.map(s => ({ ...s, id: s.id.toString() }));
    },
    saveSuggestions: async (suggestions) => {
      const normalized = suggestions.map(s => ({ ...s, id: s.id.toString() }));
      const previous = getFromStorage(STORAGE_KEYS.SUGGESTIONS, []);
      setToStorage(STORAGE_KEYS.SUGGESTIONS, normalized);
      if (firebaseActive) {
        const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))]);
        (async () => {
          try {
            const prevIds = new Set(previous.map(s => s.id.toString()));
            const newIds = new Set(normalized.map(s => s.id));
            const delIds = [...prevIds].filter(id => !newIds.has(id));
            const batch = db.batch();
            normalized.forEach(s => batch.set(db.collection('suggestions').doc(s.id), s));
            delIds.forEach(id => batch.delete(db.collection('suggestions').doc(id)));
            await withTimeout(batch.commit(), 5000);
          } catch (e) { console.warn("Firebase suggestions sync failed:", e.message); }
        })();
      }
      return true;
    },
    getProducts: () => {
      const products = getFromStorage(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      // Ensure IDs are strings
      return products.map(p => ({ ...p, id: p.id.toString() }));
    },
    saveProducts: async (products) => {
      // Ensure IDs are strings before saving
      const normalizedProducts = products.map(p => ({ ...p, id: p.id.toString() }));
      
      // ── ALWAYS save to localStorage FIRST for instant response ──
      const previousProducts = getFromStorage(STORAGE_KEYS.PRODUCTS, []);
      setToStorage(STORAGE_KEYS.PRODUCTS, normalizedProducts);

      // ── Then sync to Firebase in background (non-blocking) ──
      if (firebaseActive) {
        // Helper: create a promise with timeout
        const withTimeout = (promise, ms) => Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
        ]);

        // Helper: prepare product for Firestore (strip large base64 to stay under 1MB doc limit)
        const prepareForFirestore = (p) => {
          const copy = { ...p };
          if (copy.image && copy.image.startsWith('data:') && copy.image.length > 800000) {
            // Image too large for Firestore — store a placeholder, image lives in localStorage only
            copy.image = '📦';
            copy._localImageOnly = true;
          }
          return copy;
        };

        // Run Firebase sync without blocking the UI
        (async () => {
          try {
            // Detect which products were deleted by comparing with previous state
            const previousIds = new Set(previousProducts.map(p => p.id.toString()));
            const newIds = new Set(normalizedProducts.map(p => p.id));
            const deletedIds = [...previousIds].filter(id => !newIds.has(id));

            const batch = db.batch();
            // Upsert current products
            normalizedProducts.forEach(p => {
              const ref = db.collection('products').doc(p.id);
              batch.set(ref, prepareForFirestore(p));
            });
            // Delete removed products
            deletedIds.forEach(id => {
              batch.delete(db.collection('products').doc(id));
            });

            await withTimeout(batch.commit(), 5000);
            console.log('✦ Firebase sync OK');
          } catch (e) {
            console.warn("Firebase sync failed (data saved locally):", e.message);
            // Data is already in localStorage, so the user won't lose anything
          }
        })();
      }

      return true;
    },

    getCart: () => {
      const cart = getFromStorage(STORAGE_KEYS.CART, []);
      return cart.map(item => ({ ...item, id: item.id.toString() }));
    },
    saveCart: (cart) => {
      const normalizedCart = cart.map(item => ({ ...item, id: item.id.toString() }));
      setToStorage(STORAGE_KEYS.CART, normalizedCart);
    },

    getSettings: () => getFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    saveSettings: async (settings) => {
      // Save locally first for instant response
      setToStorage(STORAGE_KEYS.SETTINGS, settings);
      applySettings();
      // Firebase sync in background
      if (firebaseActive) {
        db.collection('settings').doc('general').set(settings).catch(e => {
          console.warn("Settings Firebase sync failed:", e.message);
        });
      }
    },

    resetAll: async () => {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.CART);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      
      if (firebaseActive) {
        try {
          // Clear products in Firebase (simplified: delete docs we know or batch delete)
          const snapshot = await db.collection('products').get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        } catch (e) {
          console.error("Error resetting Firebase data:", e);
        }
      }
      window.location.reload();
    },

    clearProducts: () => {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    },

    init: async () => {
      // One-time migration: clear stale product cache from older version
      if (!localStorage.getItem(DATA_VERSION)) {
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        localStorage.removeItem(STORAGE_KEYS.CART);
        localStorage.setItem(DATA_VERSION, 'true');
        console.log('%c✦ AURA: Cache limpiado (migración de versión).', 'color: #b59b6d;');
      }

      initFirebase();
      await syncFromFirebase();
      initCookies();
      applySettings();

      const theme = localStorage.getItem('aura_theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    },

    toggleTheme: () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('aura_theme', next);
      return next;
    },

    getTheme: () => document.documentElement.getAttribute('data-theme') || 'light',

    icons: auraIcons,
    showToast,
    compressImage,
    escapeHTML: (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[m]));
    },
    renderImage: (img) => {
      if (!img || typeof img !== 'string') return '📦';
      if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
        const safeUrl = img.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
        return `<img src="${safeUrl}" alt="Producto" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" onerror="this.outerHTML='📦'" />`;
      }
      return img;
    }
  };
})();
