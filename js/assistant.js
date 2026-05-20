/**
 * @file assistant.js
 * @description AURA Virtual Assistant Logic.
 * Integrates with auraStore to provide product information and support.
 */
"use strict";

(() => {
    const ASSISTANT_NAME = "AURA Assistant";
    const GREETING = "¡Hola! Soy tu asistente de AURA. ¿En qué puedo ayudarte hoy?";
    
    let container, fab, chatWindow, messagesArea, input, sendBtn;

    const botResponses = {
        "envio": "Ofrecemos envío gratuito en pedidos superiores a $80. El tiempo estimado de entrega es de 3 a 5 días hábiles.",
        "garantia": "Todos nuestros productos cuentan con 30 días de garantía total. Si no estás satisfecho, puedes devolverlo sin preguntas.",
        "pago": "Aceptamos tarjetas de crédito, débito y transferencias seguras. Todos tus pagos están protegidos con cifrado SSL.",
        "productos": "Tenemos una selección premium de tecnología. ¿Buscas algo en específico? Puedo mostrarte nuestro catálogo.",
        "contacto": "Puedes contactarnos vía WhatsApp para una atención más personalizada. ¿Deseas que te redirija?",
        "carrito": "Puedo ayudarte a revisar lo que tienes guardado. ¿Quieres ver tu carrito?",
        "nosotros": "AURA nació en 2026 con el propósito de ofrecer objetos tecnológicos que combinan diseño minimalista y alta calidad.",
        "ayuda": "Puedo informarte sobre envíos, garantías, métodos de pago o mostrarte nuestros productos estrella."
    };

    const quickActions = [
        { label: "📦 Envíos", query: "envio" },
        { label: "🛡️ Garantía", query: "garantia" },
        { label: "✨ Productos", query: "productos" },
        { label: "🛒 Mi Carrito", query: "carrito" }
    ];

    const init = () => {
        injectHTML();
        initElements();
        addEventListeners();
        
        // Initial greeting after a small delay
        setTimeout(() => {
            addMessage("bot", GREETING);
        }, 1000);
    };

    const injectHTML = () => {
        const html = `
            <div class="aura-assistant-container">
                <button class="assistant-fab" id="assistantFab" aria-label="Abrir asistente">
                    <svg viewBox="0 0 24 24"><path d="M12,2A10,10,0,0,0,2,12c0,3.31,1.61,6.24,4.1,8.08L4.36,22.1a1,1,0,0,0,1.38,1.26l3.35-1.92A9.91,9.91,0,0,0,12,22a10,10,0,0,0,0-20Zm0,18a8,8,0,0,1-4.32-1.26,1,1,0,0,0-1.09.05l-1.83,1.05,1.05-1.83a1,1,0,0,0-.05-1.09A8,8,0,1,1,12,20Z"/><circle cx="8" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/></svg>
                </button>
                <div class="assistant-window" id="assistantWindow">
                    <div class="assistant-header">
                        <div class="assistant-avatar">✦</div>
                        <div class="assistant-info">
                            <h3>AURA Assistant</h3>
                            <p>En línea • Soporte Premium</p>
                        </div>
                        <button class="assistant-close-btn" id="assistantClose" aria-label="Cerrar asistente">✕</button>
                    </div>
                    <div class="assistant-messages" id="assistantMessages">
                        <!-- Messages go here -->
                    </div>
                    <div class="assistant-quick-actions" id="assistantQuickActions">
                        <!-- Quick actions go here -->
                    </div>
                    <div class="assistant-input-area">
                        <input type="text" id="assistantInput" placeholder="Escribe tu duda aquí..." autocomplete="off">
                        <button class="send-btn" id="assistantSend" aria-label="Enviar">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    const initElements = () => {
        container = document.querySelector('.aura-assistant-container');
        fab = document.getElementById('assistantFab');
        chatWindow = document.getElementById('assistantWindow');
        messagesArea = document.getElementById('assistantMessages');
        input = document.getElementById('assistantInput');
        sendBtn = document.getElementById('assistantSend');
        
        renderQuickActions();
    };

    const renderQuickActions = () => {
        const qaContainer = document.getElementById('assistantQuickActions');
        qaContainer.innerHTML = quickActions.map(action => `
            <button class="action-btn" data-query="${action.query}">${action.label}</button>
        `).join('');
        
        qaContainer.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                handleUserQuery(btn.textContent, query);
            });
        });
    };

    const addEventListeners = () => {
        fab.addEventListener('click', toggleAssistant);

        // Close button in header
        document.getElementById('assistantClose')?.addEventListener('click', toggleAssistant);
        
        sendBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) handleUserQuery(text);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text) handleUserQuery(text);
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && chatWindow.classList.contains('open')) {
                toggleAssistant();
            }
        });

        // Event delegation for dynamic add-to-cart buttons in chat messages
        messagesArea.addEventListener('click', (e) => {
            const btn = e.target.closest('.assistant-add-to-cart-btn');
            if (btn) {
                const id = btn.dataset.id;
                if (window.auraAddToCart) {
                    window.auraAddToCart(id);
                    btn.textContent = '✓ Listo';
                    btn.disabled = true;
                    btn.style.borderColor = 'var(--border)';
                    btn.style.color = 'var(--muted)';
                }
            }
        });
    };

    const toggleAssistant = () => {
        const isOpen = chatWindow.classList.toggle('open');
        fab.classList.toggle('active');
        if (isOpen) {
            input.focus();
            // Scroll to bottom
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    };

    const addMessage = (type, text, raw = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        // Use textContent for user messages (XSS-safe)
        if (type === 'user') {
            msgDiv.textContent = text;
        } else if (raw) {
            // Raw HTML for bot messages with interactive elements (buttons, etc.)
            msgDiv.innerHTML = text;
        } else {
            msgDiv.innerHTML = auraStore.escapeHTML(text).replace(/\n/g, '<br>');
        }
        messagesArea.appendChild(msgDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return msgDiv;
    };

    const showTyping = () => {
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        messagesArea.appendChild(typing);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return typing;
    };

    const handleUserQuery = (text, directQuery = null) => {
        addMessage("user", text);
        input.value = "";
        
        const typing = showTyping();
        
        setTimeout(() => {
            typing.remove();
            processResponse(directQuery || text.toLowerCase());
        }, 800);
    };

    /** Normalize Spanish accented characters for better keyword matching */
    const normalizeText = (text) => text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const processResponse = (query) => {
        const normalizedQuery = normalizeText(query);

        // Special logic: Add to cart intent
        if (normalizedQuery.includes('agrega') || normalizedQuery.includes('anade') || normalizedQuery.includes('quiero') || normalizedQuery.includes('comprar')) {
            const products = auraStore.getProducts();
            let foundProduct = null;
            
            for (const p of products) {
                if (normalizedQuery.includes(normalizeText(p.name))) {
                    foundProduct = p;
                    break;
                }
            }

            if (foundProduct) {
                if (window.auraAddToCart) {
                    window.auraAddToCart(foundProduct.id);
                    addMessage('bot', `¡Listo! He añadido <strong>${auraStore.escapeHTML(foundProduct.name)}</strong> a tu carrito. 🛒`, true);
                    return;
                }
            }
        }

        // Special logic for product listing
        if (normalizedQuery.includes('producto') || normalizedQuery.includes('catalogo') || normalizedQuery.includes('que hay') || normalizedQuery.includes('tienda') || normalizedQuery.includes('vender')) {
            const products = auraStore.getProducts();
            if (products.length > 0) {
                const topProducts = products.slice(0, 5).map(p => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.15);"><span><strong>${auraStore.escapeHTML(p.name)}</strong><br><span style="font-size:0.8rem;color:var(--accent);">$${parseFloat(p.price).toFixed(2)}</span></span><button class="action-btn assistant-add-to-cart-btn" data-id="${auraStore.escapeHTML(p.id)}" style="padding:5px 10px;font-size:0.75rem;white-space:nowrap;">🛒 Agregar</button></div>`).join('');
                addMessage('bot', `¡Claro! Esto es lo que tenemos:<br><br>${topProducts}<br>Escríbeme <em>"agrega [nombre]"</em> o haz clic en los botones.`, true);
            } else {
                addMessage('bot', 'Actualmente estamos renovando nuestro catálogo. ¡Vuelve pronto para ver las novedades!');
            }
            return;
        }

        // Special logic for cart
        if (normalizedQuery.includes('carrito') || normalizedQuery.includes('comprado') || normalizedQuery.includes('mi pedido')) {
            const cart = auraStore.getCart();
            if (cart.length > 0) {
                const total = cart.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0);
                addMessage('bot', `Tienes ${cart.length} producto${cart.length !== 1 ? 's' : ''} en tu carrito. El total actual es de $${total.toFixed(2)}.\n\n¿Deseas finalizar tu compra? Haz clic en el botón 'Carrito' arriba a la derecha.`);
            } else {
                addMessage('bot', 'Tu carrito está vacío. ¡Es un buen momento para añadir algo especial!');
            }
            return;
        }

        // Keyword matching (accent-insensitive)
        let found = false;
        for (const key in botResponses) {
            if (normalizedQuery.includes(normalizeText(key))) {
                addMessage('bot', botResponses[key]);
                found = true;
                break;
            }
        }

        if (!found) {
            addMessage('bot', 'No tengo una respuesta específica para eso. Puedes preguntarme sobre:\n\n• Envíos y entregas\n• Garantía y devoluciones\n• Métodos de pago\n• Nuestros productos\n• Tu carrito de compras');
        }
    };

    // Export to global for integration if needed
    globalThis.auraAssistant = {
        toggle: toggleAssistant,
        sendMessage: (text) => handleUserQuery(text)
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
