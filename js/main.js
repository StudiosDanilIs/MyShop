// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productShortDescInput = document.getElementById('product-short-desc');
    const productLongDescInput = document.getElementById('product-long-desc');
    const productPriceInput = document.getElementById('product-price');
    const productOriginalPriceInput = document.getElementById('product-original-price');
    const productDiscountInput = document.getElementById('product-discount');
    const productImagesInput = document.getElementById('product-images');
    const productStockInput = document.getElementById('product-stock');
    const productCategoryInput = document.getElementById('product-category');
    const productFeaturedInput = document.getElementById('product-featured');
    const productOnSaleInput = document.getElementById('product-on-sale');
    const productIdHidden = document.getElementById('product-id-hidden'); // Para el ID al editar

    const productsTableBody = document.querySelector('#products-table tbody');
    const noProductsMessage = document.getElementById('no-products-message');
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const messageArea = document.getElementById('message-area');

    let isEditMode = false;

    // --- Funciones de Utilidad ---

    function showMessage(message, type = 'success') {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000); // Ocultar después de 5 segundos
    }

    function clearForm() {
        productForm.reset();
        productIdHidden.value = '';
        productIdInput.readOnly = false; // El ID solo es editable al crear
        formTitle.textContent = 'Añadir Nuevo Producto';
        cancelEditBtn.style.display = 'none';
        isEditMode = false;
    }

    async function fetchProducts() {
        productsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Cargando productos...</td></tr>';
        noProductsMessage.style.display = 'none';
        try {
            const response = await fetch('/.netlify/functions/get-products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            renderProductsTable(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            productsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar productos.</td></tr>';
            showMessage('Error al cargar productos: ' + error.message, 'error');
        }
    }

    function renderProductsTable(products) {
        productsTableBody.innerHTML = '';
        if (products.length === 0) {
            noProductsMessage.style.display = 'block';
            return;
        }
        noProductsMessage.style.display = 'none';

        products.forEach(product => {
            const row = productsTableBody.insertRow();
            row.dataset.productId = product.id; // Almacena el ID en la fila

            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.nombre}</td>
                <td>S/${parseFloat(product.precio).toFixed(2)}</td>
                <td>${product.stock || 'N/A'}</td>
                <td>${product.categoria || 'N/A'}</td>
                <td>${product.destacado ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-times-circle text-danger"></i>'}</td>
                <td>${product.enOferta ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-times-circle text-danger"></i>'}</td>
                <td>
                    <button class="btn btn-small btn-secondary edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${product.id}"><i class="fas fa-trash-alt"></i> Eliminar</button>
                </td>
            `;
        });

        attachTableEventListeners();
    }

    function attachTableEventListeners() {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.onclick = (e) => loadProductForEdit(e.target.dataset.id);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.onclick = (e) => deleteProduct(e.target.dataset.id);
        });
    }

    async function loadProductForEdit(productId) {
        try {
            const response = await fetch(`/.netlify/functions/get-product-by-id?id=${productId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const product = await response.json();

            productIdHidden.value = product.id;
            productIdInput.value = product.id;
            productIdInput.readOnly = true; // No permitir cambiar el ID al editar
            productNameInput.value = product.nombre;
            productShortDescInput.value = product.descripcion_corta || '';
            productLongDescInput.value = product.descripcion || '';
            productPriceInput.value = parseFloat(product.precio).toFixed(2);
            productOriginalPriceInput.value = product.precioOriginal ? parseFloat(product.precioOriginal).toFixed(2) : '';
            productDiscountInput.value = product.descuento || '';
            productImagesInput.value = (product.imagenes && product.imagenes.length > 0) ? product.imagenes.join(', ') : '';
            productStockInput.value = product.stock || '';
            productCategoryInput.value = product.categoria || '';
            productFeaturedInput.checked = product.destacado || false;
            productOnSaleInput.checked = product.enOferta || false;

            formTitle.textContent = `Editar Producto: ${product.nombre}`;
            cancelEditBtn.style.display = 'inline-block';
            isEditMode = true;
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll al formulario
        } catch (error) {
            console.error('Error loading product for edit:', error);
            showMessage('Error al cargar producto para edición: ' + error.message, 'error');
        }
    }

    async function deleteProduct(productId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
            return;
        }

        try {
            const response = await fetch(`/.netlify/functions/delete-product?id=${productId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showMessage(result.message || 'Producto eliminado exitosamente.', 'success');
            fetchProducts(); // Recargar la tabla
        } catch (error) {
            console.error('Error deleting product:', error);
            showMessage('Error al eliminar producto: ' + error.message, 'error');
        }
    }

    // --- Event Listeners ---

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productData = {
            id: productIdInput.value.trim(),
            nombre: productNameInput.value.trim(),
            descripcion: productLongDescInput.value.trim(),
            descripcion_corta: productShortDescInput.value.trim(),
            precio: parseFloat(productPriceInput.value),
            precioOriginal: productOriginalPriceInput.value ? parseFloat(productOriginalPriceInput.value) : null,
            descuento: productDiscountInput.value ? parseInt(productDiscountInput.value) : null,
            imagenes: productImagesInput.value.split(',').map(url => url.trim()).filter(url => url !== ''),
            stock: productStockInput.value ? parseInt(productStockInput.value) : null,
            categoria: productCategoryInput.value.trim(),
            destacado: productFeaturedInput.checked,
            enOferta: productOnSaleInput.checked,
        };

        // Validaciones básicas
        if (!productData.id || !productData.nombre || isNaN(productData.precio)) {
            showMessage('Por favor, completa los campos obligatorios (ID, Nombre, Precio válido).', 'error');
            return;
        }
        if (productData.imagenes.length === 0) {
            showMessage('Por favor, introduce al menos una URL de imagen.', 'error');
            return;
        }

        try {
            let response;
            if (isEditMode) {
                response = await fetch(`/.netlify/functions/update-product?id=${productIdHidden.value}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData),
                });
            } else {
                response = await fetch('/.netlify/functions/create-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showMessage(`Producto ${isEditMode ? 'actualizado' : 'creado'} exitosamente: ${result.nombre}`, 'success');
            clearForm();
            fetchProducts(); // Recargar la tabla con los nuevos datos
        } catch (error) {
            console.error(`Error ${isEditMode ? 'actualizando' : 'creando'} producto:`, error);
            showMessage(`Error al ${isEditMode ? 'actualizar' : 'crear'} producto: ` + error.message, 'error');
        }
    });

    cancelEditBtn.addEventListener('click', clearForm);

    // --- Inicialización ---
    fetchProducts();
});