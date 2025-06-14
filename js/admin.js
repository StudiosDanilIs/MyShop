// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const adminKeyInput = document.getElementById('adminKeyInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const adminPanel = document.getElementById('admin-panel');

    const productForm = document.getElementById('productForm');
    const statusMessage = document.getElementById('statusMessage');
    const productList = document.getElementById('productList');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    let editingProductId = null; // Para saber si estamos editando o añadiendo

    // Función para mostrar mensajes de estado
    function showMessage(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `message ${type}`;
        setTimeout(() => statusMessage.textContent = '', 5000); // Limpiar mensaje después de 5 segundos
    }

    // --- Lógica de Inicio de Sesión ---
    loginBtn.addEventListener('click', () => {
        const enteredKey = adminKeyInput.value.trim();
        // NOTA: En un entorno real, no validarías la clave aquí en el frontend.
        // Enviarías al backend para validar y recibir un token de sesión.
        // Para esta demo, simplemente guardamos la clave para enviarla en los headers.

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

    // --- Funciones CRUD ---

    // Función para realizar peticiones a la API
    async function apiRequest(method, endpoint, data = null) {
        const adminKey = localStorage.getItem('adminKey');
        if (!adminKey) {
            showMessage('Error: Clave de administrador no encontrada. Por favor, inicia sesión.', 'error');
            return null;
        }

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': adminKey // Envía la clave en el header
            },
            body: data ? JSON.stringify(data) : null
        };

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
        const adminKey = localStorage.getItem('adminKey');
        if (!adminKey) { // Si no hay clave, no intentes cargar productos todavía para el panel
            adminPanel.style.display = 'none';
            loginSection.style.display = 'block';
            return;
        } else {
             // Si hay una clave, intentamos mostrar el panel.
             // La función product.js ya no requiere clave para GET, solo para POST/PUT/DELETE
             // Así que podemos cargar la lista de productos
             adminPanel.style.display = 'block';
             loginSection.style.display = 'none';
        }

        const products = await apiRequest('GET', '', null); // GET no necesita clave para esta demo
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

        const product = {
            id: document.getElementById('id').value,
            nombre: document.getElementById('nombre').value,
            descripcion: document.getElementById('descripcion').value,
            descripcion_corta: document.getElementById('descripcion_corta').value,
            precio: parseFloat(document.getElementById('precio').value),
            precioOriginal: document.getElementById('precioOriginal').value ? parseFloat(document.getElementById('precioOriginal').value) : null,
            descuento: document.getElementById('descuento').value ? parseInt(document.getElementById('descuento').value) : null,
            imagenes: document.getElementById('imagenes').value.split(',').map(url => url.trim()).filter(url => url !== ''),
            stock: parseInt(document.getElementById('stock').value),
            categoria: document.getElementById('categoria').value,
            destacado: document.getElementById('destacado').checked,
            enOferta: document.getElementById('enOferta').checked
        };

        let result;
        if (editingProductId) {
            result = await apiRequest('PUT', `?id=${editingProductId}`, product);
            if (result) {
                showMessage('Producto actualizado exitosamente.');
                editingProductId = null;
                submitBtn.textContent = 'Añadir Producto';
                cancelEditBtn.style.display = 'none';
                productForm.reset();
                document.getElementById('id').disabled = false; // Habilitar ID al añadir
            }
        } else {
            result = await apiRequest('POST', '', product);
            if (result) {
                showMessage('Producto añadido exitosamente.');
                productForm.reset();
            }
        }

        if (result) {
            loadProducts(); // Recargar la lista de productos
        }
    });

    // Editar producto
    productList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const productId = e.target.dataset.id;
            const productToEdit = (await apiRequest('GET', `?id=${productId}`))[0]; // Obtener el producto específico
            
            if (productToEdit) {
                document.getElementById('id').value = productToEdit.id;
                document.getElementById('id').disabled = true; // No permitir cambiar ID en edición
                document.getElementById('nombre').value = productToEdit.nombre;
                document.getElementById('descripcion').value = productToEdit.descripcion || '';
                document.getElementById('descripcion_corta').value = productToEdit.descripcion_corta || '';
                document.getElementById('precio').value = productToEdit.precio;
                document.getElementById('precioOriginal').value = productToEdit.precioOriginal || '';
                document.getElementById('descuento').value = productToEdit.descuento || '';
                document.getElementById('imagenes').value = (productToEdit.imagenes || []).join(', ');
                document.getElementById('stock').value = productToEdit.stock;
                document.getElementById('categoria').value = productToEdit.categoria || '';
                document.getElementById('destacado').checked = productToEdit.destacado || false;
                document.getElementById('enOferta').checked = productToEdit.enOferta || false;

                editingProductId = productId;
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
        document.getElementById('id').disabled = false; // Habilitar ID al cancelar edición
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
        adminKeyInput.value = localStorage.getItem('adminKey'); // Precargar la clave si existe
        loadProducts(); // Intentar cargar productos
    }
});