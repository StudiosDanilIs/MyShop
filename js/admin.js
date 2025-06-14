// MYSHOP/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const adminKeyInput = document.getElementById('adminKeyInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const adminPanel = document.getElementById('admin-panel');
    const loginSection = document.getElementById('login-section');

    const productForm = document.getElementById('productForm');
    const statusMessage = document.getElementById('statusMessage');
    const productList = document.getElementById('productList');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    const productNameInput = document.getElementById('nombre');
    const productIdInput = document.getElementById('id');
    const productTypeSelect = document.getElementById('tipo');
    const productCategoryInput = document.getElementById('categoria');

    // Elementos para subir archivos
    const fileUploadInput = document.getElementById('fileUpload');
    const fileImagePreviewContainer = document.getElementById('fileImagePreview');
    let selectedFiles = []; // Array para almacenar los archivos seleccionados para subir

    // Elementos para URLs directas de imagen
    const imageUrlsInput = document.getElementById('imageUrls');
    const urlImagePreviewContainer = document.getElementById('urlImagePreview');


    let editingProductId = null; // Para saber si estamos editando o añadiendo

    // Función para mostrar mensajes de estado
    function showMessage(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `message ${type}`;
        setTimeout(() => statusMessage.textContent = '', 5000);
    }

    // --- Lógica de Inicio de Sesión ---
    loginBtn.addEventListener('click', () => {
        const enteredKey = adminKeyInput.value.trim();
        if (enteredKey) {
            localStorage.setItem('adminKey', enteredKey); // Guardar la clave en localStorage
            loginMessage.textContent = 'Clave guardada. Intentando cargar productos...';
            loginMessage.className = 'message success';
            loadProducts(); // Intentar cargar productos (que ahora enviará la clave)
        } else {
            loginMessage.textContent = 'Por favor, ingresa una clave.';
            loginMessage.className = 'message error';
        }
    });

    // --- Generación de ID automático ---
    productNameInput.addEventListener('input', () => {
        if (!editingProductId) { // Solo si no estamos editando un producto existente
            const name = productNameInput.value.trim();
            const generatedId = name
                .toLowerCase()
                .replace(/ /g, '-')     // Reemplaza espacios con guiones
                .replace(/[^\w-]+/g, ''); // Elimina caracteres no alfanuméricos ni guiones
            productIdInput.value = generatedId;
        }
    });

    // --- Previsualización de imágenes subidas desde archivo ---
    fileUploadInput.addEventListener('change', (event) => {
        fileImagePreviewContainer.innerHTML = ''; // Limpiar previsualizaciones anteriores
        selectedFiles = Array.from(event.target.files).slice(0, 5); // Limitar a 5 archivos

        selectedFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    fileImagePreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
        // Si hay archivos, limpiar las URLs para evitar conflictos
        if (selectedFiles.length > 0) {
            imageUrlsInput.value = '';
            urlImagePreviewContainer.innerHTML = '';
        }
    });

    // --- Previsualización de imágenes por URL ---
    imageUrlsInput.addEventListener('input', () => {
        urlImagePreviewContainer.innerHTML = '';
        const urls = imageUrlsInput.value.split(',').map(url => url.trim()).filter(url => url !== '');
        urls.forEach(url => {
            if (url) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Preview';
                urlImagePreviewContainer.appendChild(img);
            }
        });
        // Si se escriben URLs, limpiar los archivos seleccionados
        if (imageUrlsInput.value.trim() !== '') {
            fileUploadInput.value = '';
            fileImagePreviewContainer.innerHTML = '';
            selectedFiles = [];
        }
    });


    // --- Funciones CRUD ---

    // Función para realizar peticiones a la API
    async function apiRequest(method, endpoint, data = null, files = []) {
        const adminKey = localStorage.getItem('adminKey');
        if (!adminKey && method !== 'GET') { // GET no requiere clave
            showMessage('Error: Clave de administrador no encontrada. Por favor, inicia sesión.', 'error');
            return null;
        }

        let bodyToSend;
        let contentType;

        if (files.length > 0) { // Si hay archivos para subir, usa FormData
            const formData = new FormData();
            // Añadir campos de texto al FormData
            for (const key in data) {
                if (Array.isArray(data[key])) { 
                    formData.append(key, JSON.stringify(data[key])); // Convertir arrays a JSON string
                } else {
                    formData.append(key, data[key]);
                }
            }
            // Añadir los archivos al FormData
            files.forEach((file, index) => {
                formData.append(`image${index}`, file, file.name); // 'imageX' es el fieldname en el backend
            });
            bodyToSend = formData;
            // Cuando usas FormData, no establezcas Content-Type, el navegador lo hace automáticamente
            contentType = null; 
        } else { // Si no hay archivos, envía JSON normal
            bodyToSend = JSON.stringify(data);
            contentType = 'application/json';
        }

        const options = {
            method: method,
            headers: {}, // Las cabeceras se añadirán condicionalmente
            body: bodyToSend
        };

        if (contentType) { 
            options.headers['Content-Type'] = contentType;
        }

        if (adminKey && method !== 'GET') {
            options.headers['X-Admin-Key'] = adminKey;
        }

        try {
            const response = await fetch(`/.netlify/functions/products${endpoint}`, options);
            const responseData = await response.json();

            if (!response.ok) {
                showMessage(`Error: ${responseData.message || 'Algo salió mal.'}`, 'error');
                return null;
            }
            return responseData;
        } catch (error) {
            console.error('Error en la petición a la API:', error);
            showMessage(`Error de conexión: ${error.message}`, 'error');
            return null;
        }
    }

    // Cargar productos
    async function loadProducts() {
        // Solo intenta mostrar el panel si hay una clave guardada
        if (localStorage.getItem('adminKey')) {
            adminPanel.style.display = 'block';
            loginSection.style.display = 'none';
        } else {
            adminPanel.style.display = 'none';
            loginSection.style.display = 'block';
            return; // No cargar productos si no hay sesión
        }

        const products = await apiRequest('GET', ''); 
        if (products) {
            productList.innerHTML = '';
            if (products.length === 0) {
                productList.innerHTML = '<p>No hay productos en la base de datos.</p>';
            } else {
                products.forEach(product => {
                    const item = document.createElement('div');
                    item.className = 'product-item';
                    item.innerHTML = `
                        <div><strong>ID:</strong> ${product.id}</div>
                        <div><strong>Nombre:</strong> ${product.nombre}</div>
                        <div><strong>Precio:</strong> S/${product.precio.toFixed(2)}</div>
                        <div><strong>Tipo:</strong> ${product.tipo || 'General'}</div>
                        <div><strong>Categoría:</strong> ${product.categoria || 'N/A'}</div>
                        <div class="actions">
                            <button class="edit-btn" data-id="${product.id}">Editar</button>
                            <button class="delete-btn" data-id="${product.id}">Eliminar</button>
                        </div>
                    `;
                    productList.appendChild(item);
                });
            }
        }
    }

    // Añadir/Actualizar producto
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Datos del formulario
        const productData = {
            id: productIdInput.value, // Este ID se usará en PUT, en POST el backend lo genera
            nombre: productNameInput.value,
            descripcion: document.getElementById('descripcion').value,
            descripcion_corta: document.getElementById('descripcion_corta').value,
            precio: parseFloat(document.getElementById('precio').value),
            precioOriginal: document.getElementById('precioOriginal').value ? parseFloat(document.getElementById('precioOriginal').value) : null,
            descuento: document.getElementById('descuento').value ? parseInt(document.getElementById('descuento').value) : null,
            // Las imágenes se gestionan aparte con `selectedFiles` o `imageUrlsInput`
            stock: parseInt(document.getElementById('stock').value),
            categoria: productCategoryInput.value,
            tipo: productTypeSelect.value
        };

        let result;
        if (editingProductId) {
            // Para PUT, el ID ya existe y no se cambia, lo usamos en el endpoint.
            // Si no se seleccionaron nuevos archivos, enviaremos las URLs que están en el campo de texto
            if (selectedFiles.length === 0) {
                 productData.imagenes = imageUrlsInput.value.split(',').map(url => url.trim()).filter(url => url !== '');
            } else {
                 productData.imagenes = []; // Si hay archivos nuevos, el backend se encargará de las URLs
            }
            
            result = await apiRequest('PUT', `?id=${editingProductId}`, productData, selectedFiles);
            if (result) {
                showMessage('Producto actualizado exitosamente.');
                editingProductId = null;
                submitBtn.textContent = 'Añadir Producto';
                cancelEditBtn.style.display = 'none';
                productForm.reset();
                productIdInput.value = ''; // Limpiar ID generado
                productNameInput.disabled = false; // Habilitar nombre para nueva ID
                resetImageInputs(); // Limpiar inputs de imagen
            }
        } else {
            // Para POST, el ID se genera en el backend.
            // Si no se seleccionaron nuevos archivos, enviaremos las URLs que están en el campo de texto
            if (selectedFiles.length === 0) {
                productData.imagenes = imageUrlsInput.value.split(',').map(url => url.trim()).filter(url => url !== '');
            } else {
                productData.imagenes = []; // Si hay archivos nuevos, el backend se encargará de las URLs
            }

            result = await apiRequest('POST', '', productData, selectedFiles);
            if (result) {
                showMessage('Producto añadido exitosamente.');
                productForm.reset();
                productIdInput.value = ''; 
                resetImageInputs();
            }
        }

        if (result) {
            loadProducts(); 
        }
    });

    // Función para resetear los inputs de imagen y previsualizaciones
    function resetImageInputs() {
        fileUploadInput.value = ''; // Limpiar el input de tipo file
        fileImagePreviewContainer.innerHTML = '';
        selectedFiles = []; // Resetear array de archivos

        imageUrlsInput.value = ''; // Limpiar el input de URLs
        urlImagePreviewContainer.innerHTML = '';
    }

    // Editar producto
    productList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const productId = e.target.dataset.id;
            const productToEdit = await apiRequest('GET', `?id=${productId}`); 
            
            if (productToEdit) {
                editingProductId = productId;
                
                productIdInput.value = productToEdit.id;
                productNameInput.value = productToEdit.nombre;
                productNameInput.disabled = true; // No permitir cambiar nombre/ID en edición

                document.getElementById('descripcion').value = productToEdit.descripcion || '';
                document.getElementById('descripcion_corta').value = productToEdit.descripcion_corta || '';
                document.getElementById('precio').value = productToEdit.precio;
                document.getElementById('precioOriginal').value = productToEdit.precioOriginal || '';
                document.getElementById('descuento').value = productToEdit.descuento || '';
                document.getElementById('stock').value = productToEdit.stock;
                productCategoryInput.value = productToEdit.categoria || '';
                productTypeSelect.value = productToEdit.tipo || 'general';

                // Al editar, NO podemos pre-cargar archivos en un input type="file" por seguridad.
                // En su lugar, cargamos las URLs existentes en el campo de texto para que el usuario las vea/modifique.
                resetImageInputs(); // Limpiar cualquier archivo/URL previo
                if (productToEdit.imagenes && productToEdit.imagenes.length > 0) {
                    imageUrlsInput.value = productToEdit.imagenes.join(', ');
                    // Disparar el evento para que se actualice la previsualización de URLs
                    imageUrlsInput.dispatchEvent(new Event('input')); 
                }

                submitBtn.textContent = 'Actualizar Producto';
                cancelEditBtn.style.display = 'inline-block';
            }
        }
    });

    // Cancelar edición
    cancelEditBtn.addEventListener('click', () => {
        productForm.reset();
        editingProductId = null;
        submitBtn.textContent = 'Añadir Producto';
        cancelEditBtn.style.display = 'none';
        productIdInput.value = ''; 
        productNameInput.disabled = false; 
        resetImageInputs(); // Asegurarse de limpiar todo
    });

    // Eliminar producto
    productList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const productId = e.target.dataset.id;
            if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
                const result = await apiRequest('DELETE', `?id=${productId}`);
                if (result) {
                    showMessage(result.message || 'Producto eliminado exitosamente.');
                    loadProducts();
                }
            }
        }
    });

    // Cargar productos al inicio si ya hay una clave guardada
    if (localStorage.getItem('adminKey')) {
        adminKeyInput.value = localStorage.getItem('adminKey'); 
        loadProducts(); 
    }
});