// Variable global para almacenar los productos una vez cargados
let productsData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Asegura que el DOM esté completamente cargado antes de ejecutar scripts
    loadContent();
    setupMobileNav(); // Asumo que tienes una función para el menú móvil
    setupThemeToggle(); // Asumo que tienes una función para el toggle de tema
    setupScrollToTop(); // Asumo que tienes una función para el scroll to top
});

// Lógica del modal de productos (asumiendo que ya la tienes y funciona)
// Debes asegurarte de que esta función (showProductModal) puede acceder a productsData
function showProductModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) {
        console.error("Producto no encontrado:", productId);
        return;
    }

    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modal-imagen-principal');
    const modalTitle = document.getElementById('modal-titulo-producto');
    const modalDescription = document.getElementById('modal-descripcion-producto');
    const modalPriceOriginal = document.getElementById('modal-precio-original');
    const modalPriceDiscount = document.getElementById('modal-precio-descuento');
    const modalDiscountBadge = document.getElementById('modal-descuento-badge');
    const miniaturasContainer = modal.querySelector('.miniaturas-container');
    const whatsappModalBtn = document.getElementById('whatsappModalBtn');

    modalImage.src = product.imagenes[0] || 'imagenes/default-placeholder.jpg'; // Usa una imagen por defecto si no hay
    modalImage.alt = product.nombre;
    modalTitle.textContent = product.nombre;
    modalDescription.textContent = product.descripcion || product.descripcionCorta || 'Sin descripción.';

    // Limpiar miniaturas anteriores
    miniaturasContainer.innerHTML = '';
    // Añadir miniaturas
    if (product.imagenes && product.imagenes.length > 0) {
        product.imagenes.forEach(imgSrc => {
            const thumb = document.createElement('img');
            thumb.src = imgSrc;
            thumb.alt = product.nombre;
            thumb.classList.add('miniatura-modal');
            thumb.addEventListener('click', () => modalImage.src = imgSrc);
            miniaturasContainer.appendChild(thumb);
        });
    }

    // Mostrar precios
    if (product.enOferta && product.precioOriginal && product.precio < product.precioOriginal) {
        modalPriceOriginal.style.display = 'inline-block';
        modalPriceOriginal.textContent = `S/${product.precioOriginal.toFixed(2)}`;
        modalPriceDiscount.style.display = 'inline-block';
        modalPriceDiscount.textContent = `S/${product.precio.toFixed(2)}`;
        modalDiscountBadge.style.display = 'inline-block';
        modalDiscountBadge.textContent = `${product.descuento || ''}% OFF`;
    } else {
        modalPriceOriginal.style.display = 'none';
        modalPriceOriginal.textContent = '';
        modalPriceDiscount.style.display = 'inline-block';
        modalPriceDiscount.textContent = `S/${product.precio.toFixed(2)}`;
        modalDiscountBadge.style.display = 'none';
        modalDiscountBadge.textContent = '';
    }

    // Actualizar enlace de WhatsApp con el nombre del producto
    whatsappModalBtn.href = `https://wa.me/51933450055?text=Hola,%20me%20interesa%20la%20gorra%20${encodeURIComponent(product.nombre)}%20(ID:%20${product.id}).%20¿Podrías%20darme%20más%20información?`;

    modal.style.display = 'flex'; // Usar flexbox para centrar
}

function attachModalEventListeners() {
    // Adjuntar listeners a los botones "Ver Detalles" (si existen en el HTML)
    document.querySelectorAll('.product-card .cta-button, .collection-card .cta-button, .offer-card .cta-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = e.target.closest('.product-card, .collection-card, .offer-card').dataset.productId;
            showProductModal(productId);
        });
    });

    // Cerrar modal al hacer clic en la X
    const closeModal = document.querySelector('.cerrar-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('productModal').style.display = 'none';
        });
    }

    // Cerrar modal al hacer clic fuera del contenido
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) {
                productModal.style.display = 'none';
            }
        });
    }
}


// Función para renderizar productos en una cuadrícula
function renderProducts(gridElement, products, cardClassName) {
    gridElement.innerHTML = ''; // Limpiar contenido existente
    if (products.length === 0) {
        gridElement.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario);">No hay productos disponibles en esta sección por ahora.</p>';
        return;
    }

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add(cardClassName);
        productCard.dataset.productId = product.id; // Almacena el ID para el modal

        // Generar HTML interno de la tarjeta
        productCard.innerHTML = `
            <img src="${product.imagenes[0] || 'imagenes/default-placeholder.jpg'}" alt="${product.nombre}">
            <h3>${product.nombre}</h3>
            ${product.enOferta && product.precioOriginal && product.precio < product.precioOriginal ?
                `<p class="original-price">S/${product.precioOriginal.toFixed(2)}</p>
                 <p class="discounted-price">S/${product.precio.toFixed(2)}</p>
                 <span class="descuento-badge">${product.descuento || ''}% OFF</span>`
                : `<p class="price">S/${product.precio.toFixed(2)}</p>`
            }
            <button class="cta-button">Ver Detalles</button>
        `;
        gridElement.appendChild(productCard);
    });
    // Volver a adjuntar listeners después de renderizar nuevos elementos
    attachModalEventListeners();
}


// --- Carga y Renderizado de Contenido Dinámico ---
async function loadContent() {
    try {
        const response = await fetch('/api/get-products'); // Apunta a tu Netlify Function para obtener productos
        
        if (!response.ok) {
            throw new Error(`Error al cargar los productos: HTTP error! status: ${response.status}`);
        }
        productsData = await response.json(); // Almacena los productos globales
        console.log('Productos cargados exitosamente desde la DB:', productsData);
    } catch (error) {
        console.error('Hubo un problema al cargar los productos desde la base de datos:', error);
        // Mostrar un mensaje de error en la UI o cargar desde un JSON de respaldo si lo deseas
        const featuredGrid = document.getElementById('featuredProductsGrid');
        const offersGrid = document.getElementById('offerProductsGrid');
        const allProductsGrid = document.getElementById('allProductsGrid');

        if (featuredGrid) featuredGrid.innerHTML = '<p style="text-align: center; color: red;">No se pudieron cargar los productos destacados.</p>';
        if (offersGrid) offersGrid.innerHTML = '<p style="text-align: center; color: red;">No se pudieron cargar las ofertas.</p>';
        if (allProductsGrid) allProductsGrid.innerHTML = '<p style="text-align: center; color: red;">No se pudieron cargar todos los productos.</p>';
        return;
    }

    const path = window.location.pathname;

    // Renderizar para index.html (o la página de inicio)
    if (path.includes('/index.html') || path === '/') {
        const featuredGrid = document.getElementById('featuredProductsGrid');
        const offersGrid = document.getElementById('offerProductsGrid');

        if (featuredGrid) {
            const featuredProducts = productsData.filter(p => p.destacado).slice(0, 4); // Mostrar, por ejemplo, 4 destacados
            renderProducts(featuredGrid, featuredProducts, 'collection-card');
        }

        if (offersGrid) {
            const offerProducts = productsData.filter(p => p.enOferta).slice(0, 4); // Mostrar, por ejemplo, 4 ofertas
            renderProducts(offersGrid, offerProducts, 'offer-card');
        }
    }

    // Renderizar para catalogo.html
    if (path.endsWith('/catalogo.html')) { // O puedes verificar si existe el elemento 'allProductsGrid'
        const allProductsGrid = document.getElementById('allProductsGrid');
        if (allProductsGrid) {
            renderProducts(allProductsGrid, productsData, 'producto-card');
        }
    }

    // Asumimos que estas funciones existen en tu `common.js` o similar
    // y se inicializan de alguna forma. Si no, agrégalas aquí o en el HTML.
    // attachModalEventListeners(); // Ya se llama dentro de renderProducts
}


// --- Funciones de Utilidad y UI (si no están en common.js) ---

// Función para el botón de tema (asumiendo que ya la tienes)
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');

    const updateThemeButton = (isLightMode) => {
        const icon = `<i class="fas ${isLightMode ? 'fa-moon' : 'fa-sun'}"></i>`;
        const text = isLightMode ? ' Modo Oscuro' : ' Modo Claro';
        if (themeToggle) themeToggle.innerHTML = icon + text;
        if (themeToggleMobile) themeToggleMobile.innerHTML = icon + text;
    };

    const currentTheme = localStorage.getItem('theme');
    const isLightMode = currentTheme === 'light-mode';
    if (isLightMode) {
        document.documentElement.classList.add('light-mode');
    }
    updateThemeButton(isLightMode);

    const toggleTheme = () => {
        const isCurrentlyLightMode = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('theme', isCurrentlyLightMode ? 'light-mode' : 'dark-mode');
        updateThemeButton(isCurrentlyLightMode);
    };

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
}

// Función para el menú móvil (asumiendo que ya la tienes)
function setupMobileNav() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.add('open');
            document.body.style.overflow = 'hidden'; // Evita el scroll en el body
        });
    }

    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('open');
            document.body.style.overflow = ''; // Restaura el scroll
        });
    }

    // Cerrar menú si se hace clic en un enlace
    if (mobileNavOverlay) {
        mobileNavOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNavOverlay.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }
}

// Función para el scroll to top (asumiendo que ya la tienes)
function setupScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    window.addEventListener('scroll', () => {
        if (scrollToTopBtn) {
            if (window.scrollY > 300) { // Mostrar botón después de 300px de scroll
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        }
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Llama a las funciones de configuración al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    loadContent();
    setupMobileNav();
    setupThemeToggle();
    setupScrollToTop();
    // Establecer el año actual en el footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});