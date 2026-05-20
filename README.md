# ✦ Guía de Desarrollo Local — AURA Store

¡Bienvenido al entorno de desarrollo local de **AURA Store**! He organizado el espacio de trabajo para que puedas editar el código y ver tus cambios reflejados al instante de dos maneras muy sencillas.

---

## 🚀 Opción 1: Servidor Instantáneo (Sin Instalar Nada)

Si deseas probar el sitio de inmediato sin esperar a que se descarguen módulos de Node, puedes usar un servidor estático rápido:

1. Abre tu terminal (**PowerShell** o **CMD**) en la carpeta del proyecto:
   `c:\Users\jjhen\Desktop\programitas random\pagian de compra de productos`
2. Ejecuta el siguiente comando:
   ```bash
   npx http-server -p 8080 -c-1
   ```
3. ¡Listo! Abre tu navegador en [http://localhost:8080](http://localhost:8080) para ver y probar el sitio.

---

## ⚡ Opción 2: Desarrollo Premium con Vite (Hot Reload)

Vite es una herramienta de desarrollo moderna y ultra-rápida. Te permite editar los archivos (`index.html`, `js/index.js`, `css/index.css`) y ver los cambios aplicarse en tu navegador al instante de forma automática:

1. Abre tu terminal en la carpeta del proyecto.
2. Instala Vite ejecutando:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre la URL que te muestre en pantalla (usualmente [http://localhost:5173](http://localhost:5173)).
5. **Cualquier cambio que guardes en el código se actualizará en tiempo real sin necesidad de recargar la página.**

---

## 📁 Estructura del Código

*   [`index.html`](file:///c:/Users/jjhen/Desktop/programitas%20random/pagian%20de%20compra%20de%20productos/index.html): Estructura visual de la tienda pública (secciones, modales, carrito, etc.).
*   [`admin.html`](file:///c:/Users/jjhen/Desktop/programitas%20random/pagian%20de%20compra%20de%20productos/admin.html): Estructura del Panel de Administración.
*   [`css/`](file:///c:/Users/jjhen/Desktop/programitas%20random/pagian%20de%20compra%20de%20productos/css/): Carpeta con las hojas de estilo premium.
    *   `variables.css`: Paleta de colores terracota/crema, tipografía y tokens de diseño.
    *   `index.css`: Estilo visual de la tienda.
    *   `assistant.css`: Diseño premium del chatbox flotante.
*   [`js/`](file:///c:/Users/jjhen/Desktop/programitas%20random/pagian%20de%20compra%20de%20productos/js/): Carpeta con la lógica JavaScript interactiva.
    *   `store.js`: Estado global, persistencia en `localStorage` y sincronización con Firebase Firestore.
    *   `index.js`: Lógica de renderizado de la tienda y controladores de UI.
    *   `assistant.js`: Respuestas y comportamientos del AURA Assistant.

---

## 💡 Consejos para la Edición

*   **Consola de Desarrollador**: Mantén siempre abierta la consola de desarrollador de tu navegador (`F12` o clic derecho -> *Inspeccionar*) para ver mensajes de estado de Firebase, depurar errores y verificar clics.
*   **Modo Oscuro**: Puedes cambiar el tema haciendo clic en el botón del sol/luna en la barra de navegación; el estado persistirá automáticamente gracias a `store.js`.
*   **Modificaciones Seguras**: Si estás editando texto o campos interactivos, recuerda que los scripts del asistente e index cuentan con sanitización de XSS (`auraStore.escapeHTML()`) para garantizar que la tienda se mantenga 100% segura.
