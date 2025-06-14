// js/producto.js
document.addEventListener('DOMContentLoaded', () => {
    let productsData = []; 

    // --- Elementos del DOM Comunes (Mantén los que ya tienes) ---
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
    const themeToggleBtn = document.getElementById('themeToggle'); 
    const themeToggleMobileBtn = document.getElementById('themeToggleMobile'); 
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    const mobileNavLinks = document.querySelectorAll('#mobileNavOverlay ul li a');
    const header = document.querySelector('.header');

    const defaultImage = 'https://placehold.co/400x250/8892B0/0A192F?text=Imagen+No+Disp';
    const phoneNumber = '+51933450055'; 

    // --- Funciones de Utilidad (Mantén estas funciones tal cual) ---
    /**
     * Genera el HTML para una tarjeta de producto.
     * @param {Object} product - Objeto producto de la DB.
     * @param {string} cardClass - Clase CSS para el tipo de tarjeta.
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
        containerElement.innerHTML = ''; 

        if (productsToRender.length === 0) {
            containerElement.innerHTML = `<p style="text-align: center; color: var(--color-texto-secundario);">No hay productos disponibles en esta sección.</p>`;
            return;
        }

        productsToRender.forEach(product => {
            containerElement.innerHTML += createProductCardHTML(product, cardClass);
        });
    }

    // --- Carga y Renderizado de Contenido Dinámico (Esta es la función que cambia) ---
    async function loadContent() { 
        try {
            // Llama a tu Netlify Function para obtener los productos
            // La ruta es relativa a la raíz de tu sitio de Netlify
            const response = await fetch('/.netlify/functions/products'); 
            
            if (!response.ok) {
                // Captura el mensaje de error de la función si lo hay
                const errorData = await response.json();
                throw new Error(`Error al cargar los productos: HTTP error! status: ${response.status}. Mensaje: ${errorData.message || 'Error desconocido'}`);
            }
            productsData = await response.json(); 
            console.log('Productos cargados exitosamente de la DB:', productsData); 
        } catch (error) {
            console.error('Hubo un problema al cargar los productos:', error);
            // Mostrar un mensaje de error en la UI si la carga falla
            const featuredGrid = document.getElementById('featuredProductsGrid');
            const offersGrid = document.getElementById('offerProductsGrid');
            const allProductsGrid = document.getElementById('allProductsGrid');

            const errorMessageHTML = '<p style="text-align: center; color: var(--color-texto-secundario);">No se pudieron cargar los productos. Inténtalo de nuevo más tarde o contacta al soporte.</p>';

            if (featuredGrid) featuredGrid.innerHTML = errorMessageHTML;
            if (offersGrid) offersGrid.innerHTML = errorMessageHTML;
            if (allProductsGrid) allProductsGrid.innerHTML = errorMessageHTML;
            
            return; 
        }

        const path = window.location.pathname;

        // Renderizar para index.html (o la raíz)
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

        attachModalEventListeners();
    }

    // --- Lógica del Modal (sin cambios) ---
    /**
     * Adjunta los event listeners a los botones "Ver Detalles".
     * Se llama después de que las tarjetas de producto son renderizadas dinámicamente.
     */
    function attachModalEventListeners() {
        document.querySelectorAll('.ver-detalles-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.currentTarget.dataset.productId;
                const selectedProduct = productsData.find(p => p.id === productId);

                if (selectedProduct) {
                    openModal(selectedProduct); 
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
                if (index === 0) img.classList.add('activa'); 
                img.addEventListener('click', () => {
                    modalImagenPrincipal.src = imgSrc; 
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

        if (product.enOferta && product.precioOriginal && product.descuento) {
            modalPrecioOriginal.textContent = `S/${product.precioOriginal.toFixed(2)}`;
            modalPrecioOriginal.style.display = 'inline-block'; 
            modalPrecioDescuento.textContent = `S/${product.precio.toFixed(2)}`;
            modalDescuentoBadge.textContent = `${product.descuento}% OFF`;
            modalDescuentoBadge.style.display = 'inline-block'; 
        } else {
            modalPrecioOriginal.style.display = 'none'; 
            modalPrecioDescuento.textContent = `S/${product.precio.toFixed(2)}`;
            modalDescuentoBadge.style.display = 'none'; 
        }

        let whatsappMessage = '';
        let productPriceText = `S/${product.precio.toFixed(2)}`;
        if (product.enOferta && product.precioOriginal) {
            productPriceText = `S/${product.precio.toFixed(2)} (Antes S/${product.precioOriginal.toFixed(2)}, ${product.descuento}% OFF)`;
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
                whatsappModalBtn.href = "#"; 
                whatsappMessage = ''; 
            }
        } else { 
            whatsappModalBtn.textContent = 'Preguntar por WhatsApp';
            whatsappModalBtn.classList.remove('disabled');
            whatsappMessage = `Hola! Estoy interesado en la gorra "${product.nombre}" (ID: ${product.id}).`;
            whatsappMessage += `\nSu precio es: ${productPriceText}.`;
            whatsappMessage += `\n¿Podrías darme más información sobre este producto?`;
        }

        if (whatsappMessage) {
            whatsappModalBtn.href = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;
        } else {
            whatsappModalBtn.href = `https://wa.me/${phoneNumber.replace('+', '')}`;
        }

        modalProducto.style.display = 'flex'; 
        document.body.style.overflow = 'hidden'; 
    }

    /**
     * Cierra el modal de producto.
     */
    function closeModal() {
        modalProducto.style.display = 'none'; 
        document.body.style.overflow = ''; 
    }

    // Event listeners para cerrar el modal (sin cambios)
    if (cerrarModalBtn) {
        cerrarModalBtn.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === modalProducto) {
            closeModal();
        }
    });

    // --- Funcionalidad del Tema Claro/Oscuro (sin cambios) ---
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

    const currentTheme = localStorage.getItem('theme');
    applyTheme(currentTheme === 'light-mode');

    [themeToggleBtn, themeToggleMobileBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                applyTheme(!document.body.classList.contains('light-mode')); 
            });
        }
    });

    // --- Funcionalidad del Menú Hamburguesa (Mobile) (sin cambios) ---
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.add('active'); 
            document.body.style.overflow = 'hidden'; 
        });
    }

    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active'); 
            document.body.style.overflow = ''; 
        });
    }

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    window.addEventListener('click', (event) => {
        if (mobileNavOverlay.classList.contains('active') &&
            !mobileNavOverlay.contains(event.target) &&
            !hamburgerMenu.contains(event.target)) {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // --- Funcionalidad de Scroll-to-top y ocultar/mostrar header (sin cambios) ---
    let lastScrollY = 0;
    const scrollThreshold = 50; 

    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('show'); 
            } else {
                scrollToTopBtn.classList.remove('show'); 
            }

            if (header) { 
                if (window.scrollY > lastScrollY && window.scrollY > scrollThreshold) {
                    header.classList.add('hidden'); 
                } else if (window.scrollY < lastScrollY) {
                    header.classList.remove('hidden'); 
                }

                if (window.scrollY === 0) {
                    header.classList.remove('hidden');
                }
            }
            lastScrollY = window.scrollY; 
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' 
            });
        });
    }

    // --- Configuración Inicial de Enlaces de WhatsApp FAB (Floating Action Button) (sin cambios) ---
    if (whatsappFab) {
        whatsappFab.href = `https://wa.me/${phoneNumber.replace('+', '')}`;
    }

    // --- INICIALIZACIÓN ---
    loadContent();
});