document.addEventListener('DOMContentLoaded', () => {
    let productsData = [];

    // --- Elementos del DOM Comunes ---
    const modalProducto = document.getElementById('productModal');
    const cerrarModalBtn = document.querySelector('.cerrar-modal');
    const modalImagenPrincipal = document.getElementById('modal-imagen-principal');
    const modalMiniaturasContainer = document.querySelector('.miniaturas-container');
    const modalTitulo = document.getElementById('modal-titulo-producto');
    const modalDescripcion = document.getElementById('modal-descripcion-producto');
    const modalPrecioOriginal = document.getElementById('modal-precio-original');
    const modalPrecioDescuento = document.getElementById('modal-precio-descuento');
    const modalDescuentoBadge = document.getElementById('modal-descuento-badge');
    const whatsappModalBtn = document.getElementById('whatsappModalBtn');
    const whatsappFab = document.querySelector('.whatsapp-fab');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const themeToggleBtn = document.getElementById('themeToggle'); // Desktop
    const themeToggleMobileBtn = document.getElementById('themeToggleMobile'); // Mobile
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    const mobileNavLinks = document.querySelectorAll('#mobileNavOverlay ul li a');
    const header = document.querySelector('.header');

    const defaultImage = 'https://placehold.co/400x250/8892B0/0A192F?text=Imagen+No+Disp';
    const phoneNumber = '+51933450055'; // Nuevo número de teléfono

    // --- Funciones de Utilidad ---

    /**
     * Genera el HTML para una tarjeta de producto.
     * @param {Object} product - Objeto producto del JSON.
     * @param {string} cardClass - Clase CSS para el tipo de tarjeta (e.g., 'producto-card', 'collection-card', 'offer-card').
     * @returns {string} HTML de la tarjeta de producto.
     */
    function createProductCardHTML(product, cardClass) {
        const imagenSrc = (product.imagenes && product.imagenes.length > 0) ?
            product.imagenes[0] :
            defaultImage;

        let priceHTML = `<span class="precio">S/${product.precio.toFixed(2)}</span>`;
        let discountBadgeHTML = '';

        if (product.enOferta && product.precioOriginal && product.descuento) {
            priceHTML = `
                <div class="price-container">
                    <span class="original-price">S/${product.precioOriginal.toFixed(2)}</span>
                    <span class="discounted-price">S/${product.precio.toFixed(2)}</span>
                </div>
            `;
            discountBadgeHTML = `<div class="discount-badge">${product.descuento}% OFF</div>`;
        }

        return `
            <div class="${cardClass}" data-product-id="${product.id}">
                ${discountBadgeHTML}
                <div class="${cardClass.replace('-card', '-image-wrapper')}">
                    <img src="${imagenSrc}" alt="${product.nombre}" class="${cardClass.replace('-card', '-image')}" loading="lazy" onerror="this.onerror=null;this.src='${defaultImage}';">
                </div>
                <div class="${cardClass.replace('-card', '-info')}">
                    <h3>${product.nombre}</h3>
                    <p>${product.descripcion_corta}</p>
                    ${priceHTML}
                    <button class="ver-detalles-btn" data-product-id="${product.id}">
                        Ver Detalles <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza un array de productos en un contenedor dado.
     * @param {HTMLElement} containerElement - El elemento DOM donde renderizar.
     * @param {Array} productsToRender - Array de objetos producto.
     * @param {string} cardClass - Clase CSS de la tarjeta (ej. 'producto-card').
     */
    function renderProducts(containerElement, productsToRender, cardClass) {
        if (!containerElement) {
            console.error(`Contenedor no encontrado.`);
            return;
        }
        containerElement.innerHTML = ''; // Limpiar contenido existente

        if (productsToRender.length === 0) {
            containerElement.innerHTML = `<p style="text-align: center; color: var(--color-texto-secundario);">No hay productos disponibles en esta sección.</p>`;
            return;
        }

        productsToRender.forEach(product => {
            containerElement.innerHTML += createProductCardHTML(product, cardClass);
        });
    }

    // --- Carga y Renderizado de Contenido Dinámico ---
    // Esta función ahora carga los datos desde tu Netlify Function
    async function loadContent() {
        try {
            // Llama a tu Netlify Function
            const response = await fetch('/.netlify/functions/get-products');

            if (!response.ok) {
                throw new Error(`Error al cargar los productos: HTTP error! status: ${response.status}`);
            }
            productsData = await response.json(); // Asigna los datos cargados a productsData
            console.log('Productos cargados exitosamente desde Neon:', productsData); // Para depuración
        } catch (error) {
            console.error('Hubo un problema al cargar los productos:', error);
            // Mostrar un mensaje de error en la UI si la carga falla
            const featuredGrid = document.getElementById('featuredProductsGrid');
            const offersGrid = document.getElementById('offerProductsGrid');
            const allProductsGrid = document.getElementById('allProductsGrid');

            if (featuredGrid) featuredGrid.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario);">No se pudieron cargar los productos destacados. Inténtalo de nuevo más tarde.</p>';
            if (offersGrid) offersGrid.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario);">No se pudieron cargar las ofertas. Inténtalo de nuevo más tarde.</p>';
            if (allProductsGrid) allProductsGrid.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario);">No se pudieron cargar todos los productos. Inténtalo de nuevo más tarde.</p>';

            return; // Detiene la ejecución de renderizado si los datos no se cargan
        }

        const path = window.location.pathname;

        // Renderizar para index.html
        if (path.includes('/index.html') || path === '/') {
            const featuredGrid = document.getElementById('featuredProductsGrid');
            const offersGrid = document.getElementById('offerProductsGrid');

            if (featuredGrid) {
                const featuredProducts = productsData.filter(p => p.destacado);
                renderProducts(featuredGrid, featuredProducts, 'collection-card');
            }

            if (offersGrid) {
                const offerProducts = productsData.filter(p => p.enOferta);
                renderProducts(offersGrid, offerProducts, 'offer-card');
            }
        }

        // Renderizar para catalogo.html
        if (path.endsWith('/catalogo.html') || document.getElementById('allProductsGrid')) {
            const allProductsGrid = document.getElementById('allProductsGrid');
            if (allProductsGrid) {
                renderProducts(allProductsGrid, productsData, 'producto-card');
            }
        }

        // Después de renderizar las tarjetas, adjuntar los event listeners para el modal
        attachModalEventListeners();
    }

    // --- Lógica del Modal ---

    /**
     * Adjunta los event listeners a los botones "Ver Detalles".
     * Se llama después de que las tarjetas de producto son renderizadas dinámicamente.
     */
    function attachModalEventListeners() {
        // Selecciona todos los botones con la clase 'ver-detalles-btn'
        document.querySelectorAll('.ver-detalles-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                // Obtiene el ID del producto del atributo data-product-id del botón
                const productId = event.currentTarget.dataset.productId;
                // Busca el producto correspondiente en el arreglo productsData
                const selectedProduct = productsData.find(p => p.id === productId);

                if (selectedProduct) {
                    openModal(selectedProduct); // Abre el modal con los datos del producto
                } else {
                    console.warn(`Producto con ID ${productId} no encontrado.`);
                }
            });
        });
    }

    /**
     * Abre el modal y muestra los detalles del producto.
     * @param {Object} product - El objeto producto a mostrar.
     */
    function openModal(product) {
        modalImagenPrincipal.src = product.imagenes[0] || defaultImage;
        modalImagenPrincipal.alt = product.nombre;

        modalMiniaturasContainer.innerHTML = '';
        if (product.imagenes && product.imagenes.length > 0) {
            product.imagenes.forEach((imgSrc, index) => {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = `Vista ${index + 1} de ${product.nombre}`;
                img.classList.add('miniatura');
                if (index === 0) img.classList.add('activa'); // Marca la primera imagen como activa
                img.addEventListener('click', () => {
                    modalImagenPrincipal.src = imgSrc; // Cambia la imagen principal al hacer clic
                    // Quita la clase 'activa' de todas las miniaturas y añádela a la que se hizo clic
                    document.querySelectorAll('.miniatura').forEach(thumb => thumb.classList.remove('activa'));
                    img.classList.add('activa');
                });
                modalMiniaturasContainer.appendChild(img);
            });
        } else {
            modalMiniaturasContainer.innerHTML = `<p style="color: var(--color-texto-secundario); font-size: 0.85rem;">No hay miniaturas disponibles.</p>`;
        }

        modalTitulo.textContent = product.nombre;
        modalDescripcion.textContent = product.descripcion;

        // Lógica para mostrar precios con y sin descuento
        if (product.enOferta && product.precioOriginal && product.descuento) {
            modalPrecioOriginal.textContent = `S/${parseFloat(product.precioOriginal).toFixed(2)}`;
            modalPrecioOriginal.style.display = 'inline-block'; // Muestra el precio original
            modalPrecioDescuento.textContent = `S/${parseFloat(product.precio).toFixed(2)}`;
            modalDescuentoBadge.textContent = `${product.descuento}% OFF`;
            modalDescuentoBadge.style.display = 'inline-block'; // Muestra la insignia de descuento
        } else {
            modalPrecioOriginal.style.display = 'none'; // Oculta el precio original
            modalPrecioDescuento.textContent = `S/${parseFloat(product.precio).toFixed(2)}`;
            modalDescuentoBadge.style.display = 'none'; // Oculta la insignia
        }

        // Configuración del mensaje de WhatsApp
        let whatsappMessage = '';
        let productPriceText = `S/${parseFloat(product.precio).toFixed(2)}`;
        if (product.enOferta && product.precioOriginal) {
            productPriceText = `S/${parseFloat(product.precio).toFixed(2)} (Antes S/${parseFloat(product.precioOriginal).toFixed(2)}, ${product.descuento}% OFF)`;
        }

        if (typeof product.stock === 'number') {
            if (product.stock > 0) {
                whatsappModalBtn.textContent = 'Preguntar por WhatsApp';
                whatsappModalBtn.classList.remove('disabled');
                whatsappMessage = `Hola! Estoy interesado en la gorra "${product.nombre}" (ID: ${product.id}).`;
                whatsappMessage += `\nSu precio es: ${productPriceText}.`;
                whatsappMessage += `\n¿Me podrías confirmar si está disponible y si tienen más fotos?`;
            } else {
                whatsappModalBtn.textContent = 'Producto Agotado';
                whatsappModalBtn.classList.add('disabled');
                whatsappModalBtn.href = "#"; // Deshabilita el enlace si está agotado
                whatsappMessage = ''; // No envía mensaje si está agotado
            }
        } else { // Si el stock no es un número (ej. undefined o null)
            whatsappModalBtn.textContent = 'Preguntar por WhatsApp';
            whatsappModalBtn.classList.remove('disabled');
            whatsappMessage = `Hola! Estoy interesado en la gorra "${product.nombre}" (ID: ${product.id}).`;
            whatsappMessage += `\nSu precio es: ${productPriceText}.`;
            whatsappMessage += `\n¿Podrías darme más información sobre este producto?`;
        }

        // Establece el enlace de WhatsApp con el mensaje codificado
        if (whatsappMessage) {
            whatsappModalBtn.href = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;
        } else {
            whatsappModalBtn.href = `https://wa.me/${phoneNumber.replace('+', '')}`;
        }

        modalProducto.style.display = 'flex'; // Muestra el modal
        document.body.style.overflow = 'hidden'; // Evita el scroll en el body cuando el modal está abierto
    }

    /**
     * Cierra el modal de producto.
     */
    function closeModal() {
        modalProducto.style.display = 'none'; // Oculta el modal
        document.body.style.overflow = ''; // Restaura el scroll del body
    }

    // Event listeners para cerrar el modal
    if (cerrarModalBtn) {
        cerrarModalBtn.addEventListener('click', closeModal);
    }
    // Cierra el modal si se hace clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target === modalProducto) {
            closeModal();
        }
    });

    // --- Funcionalidad del Tema Claro/Oscuro ---
    function applyTheme(isLightMode) {
        if (isLightMode) {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light-mode');
            const iconHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
            if (themeToggleBtn) themeToggleBtn.innerHTML = iconHTML;
            if (themeToggleMobileBtn) themeToggleMobileBtn.innerHTML = iconHTML;
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark-mode');
            const iconHTML = '<i class="fas fa-sun"></i> Modo Claro';
            if (themeToggleBtn) themeToggleBtn.innerHTML = iconHTML;
            if (themeToggleMobileBtn) themeToggleMobileBtn.innerHTML = iconHTML;
        }
    }

    // Cargar el tema guardado o establecer el predeterminado (dark)
    const currentTheme = localStorage.getItem('theme');
    applyTheme(currentTheme === 'light-mode');

    // Event listeners para los botones de cambio de tema
    [themeToggleBtn, themeToggleMobileBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                applyTheme(!document.body.classList.contains('light-mode')); // Invierte el tema actual
            });
        }
    });

    // --- Funcionalidad del Menú Hamburguesa (Mobile) ---
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.add('active'); // Muestra el overlay del menú móvil
            document.body.style.overflow = 'hidden'; // Deshabilita el scroll del body
        });
    }

    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active'); // Oculta el overlay
            document.body.style.overflow = ''; // Habilita el scroll del body
        });
    }

    // Cierra el menú móvil al hacer clic en un enlace
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Cierra el menú móvil si se hace clic fuera del overlay y del botón de hamburguesa
    window.addEventListener('click', (event) => {
        if (mobileNavOverlay.classList.contains('active') &&
            !mobileNavOverlay.contains(event.target) &&
            !hamburgerMenu.contains(event.target)) {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });


    // --- Funcionalidad de Scroll-to-top y ocultar/mostrar header ---
    let lastScrollY = 0;
    const scrollThreshold = 50; // Umbral de scroll para ocultar el header

    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            // Visibilidad del botón "Volver arriba"
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('show'); // Muestra el botón
            } else {
                scrollToTopBtn.classList.remove('show'); // Oculta el botón
            }

            // Visibilidad del header (ocultar al hacer scroll hacia abajo, mostrar al scroll hacia arriba)
            if (header) { // Asegura que el header existe en el DOM
                if (window.scrollY > lastScrollY && window.scrollY > scrollThreshold) {
                    header.classList.add('hidden'); // Oculta el header
                } else if (window.scrollY < lastScrollY) {
                    header.classList.remove('hidden'); // Muestra el header
                }

                // Asegura que el header siempre se vea al principio de la página
                if (window.scrollY === 0) {
                    header.classList.remove('hidden');
                }
            }
            lastScrollY = window.scrollY; // Actualiza la última posición de scroll
        });

        // Event listener para el botón "Volver arriba"
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Scroll suave
            });
        });
    }

    // --- Configuración Inicial de Enlaces de WhatsApp FAB (Floating Action Button) ---
    if (whatsappFab) {
        whatsappFab.href = `https://wa.me/${phoneNumber.replace('+', '')}`;
    }

    // --- INICIALIZACIÓN ---
    // Llama a la función asíncrona para cargar los productos y renderizar el contenido
    // Esta es la primera acción importante que se ejecuta cuando el DOM está listo
    loadContent();
});