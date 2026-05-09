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
        "nosotros": "AURA nació en 2025 con el propósito de ofrecer objetos tecnológicos que combinan diseño minimalista y alta calidad.",
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

    const addMessage = (type, text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.textContent = text;
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

    const processResponse = (query) => {
        // Special logic for product listing
        if (query.includes("producto") || query.includes("catálogo") || query.includes("vender") || query.includes("comprar")) {
            const products = auraStore.getProducts();
            if (products.length > 0) {
                const topProducts = products.slice(0, 3).map(p => `• ${p.name} ($${parseFloat(p.price).toFixed(2)})`).join('\n');
                addMessage("bot", `¡Claro! Estos son algunos de nuestros productos más destacados:\n\n${topProducts}\n\n¿Te gustaría ver más? Puedes explorar la sección de productos abajo.`);
            } else {
                addMessage("bot", "Actualmente estamos renovando nuestro catálogo. ¡Vuelve pronto para ver las novedades!");
            }
            return;
        }

        // Special logic for cart
        if (query.includes("carrito") || query.includes("comprado") || query.includes("mi pedido")) {
            const cart = auraStore.getCart();
            if (cart.length > 0) {
                const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                addMessage("bot", `Tienes ${cart.length} productos en tu carrito. El total actual es de $${total.toFixed(2)}.\n\n¿Deseas finalizar tu compra? Haz clic en el botón 'Carrito' arriba a la derecha.`);
            } else {
                addMessage("bot", "Tu carrito está vacío. ¡Es un buen momento para añadir algo especial!");
            }
            return;
        }

        // Keyword matching
        let found = false;
        const normalizedQuery = query.toLowerCase();
        for (const key in botResponses) {
            if (normalizedQuery.includes(key)) {
                addMessage("bot", botResponses[key]);
                found = true;
                break;
            }
        }

        if (!found) {
            addMessage("bot", "Lo siento, no tengo una respuesta específica para eso. ¿Podrías intentar con palabras clave como 'envío', 'productos' o 'garantía'?");
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
