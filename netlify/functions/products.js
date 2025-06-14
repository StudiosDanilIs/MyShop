// MYSHOP/netlify/functions/products.js
const { Pool } = require('@neondatabase/serverless');
const Busboy = require('busboy');
const cloudinary = require('cloudinary').v2;

// --- Configuración de Variables de Entorno (se obtienen de Netlify) ---
const connectionString = process.env.DATABASE_URL;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configurar Cloudinary con tus credenciales
cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

const pool = new Pool({ connectionString });

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Permite cualquier origen (ajustar en producción)
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key', // Necesario para la clave
        'Content-Type': 'application/json' // Tipo de contenido por defecto para respuestas JSON
    };

    // Manejo de pre-vuelos OPTIONS para CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: ''
        };
    }

    const method = event.httpMethod;
    const path = event.path;

    try {
        // Validación básica de ruta
        if (!path.startsWith('/.netlify/functions/products')) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: 'Ruta de API no encontrada.' }),
            };
        }

        // --- Autenticación para operaciones de escritura (POST, PUT, DELETE) ---
        if (method !== 'GET') {
            const providedKey = event.headers['x-admin-key'];
            if (!providedKey || providedKey !== ADMIN_SECRET_KEY) {
                return {
                    statusCode: 401, // Unauthorized
                    headers: headers,
                    body: JSON.stringify({ message: 'Acceso no autorizado. Clave de administrador requerida.' }),
                };
            }
        }

        let formData = {}; // Almacenará campos de texto del formulario
        let uploadedImageUrls = []; // Almacenará URLs de imágenes subidas a Cloudinary

        // --- Manejo de la carga de archivos (multipart/form-data) o JSON normal ---
        if (method === 'POST' || method === 'PUT') {
            // Verificar si la solicitud es multipart/form-data (contiene archivos)
            if (event.headers['content-type'] && event.headers['content-type'].includes('multipart/form-data')) {
                const busboy = Busboy({ headers: event.headers });
                
                await new Promise((resolve, reject) => {
                    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                        console.log(`Subiendo archivo: ${filename}`);
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { 
                                folder: "myshop_products", // Carpeta en tu Cloudinary
                                format: "webp" // Opcional: convertir a WebP para optimización
                            },
                            (error, result) => {
                                if (error) {
                                    console.error("Cloudinary Upload Error:", error);
                                    reject(new Error(`Error al subir imagen: ${error.message}`));
                                } else {
                                    console.log("Cloudinary Upload Success:", result.url);
                                    uploadedImageUrls.push(result.url);
                                }
                            }
                        );
                        file.pipe(uploadStream); // Envía el archivo directamente al stream de Cloudinary
                    });

                    busboy.on('field', (fieldname, val) => {
                        // Los campos de texto se guardan en formData
                        try {
                            // Intenta parsear como JSON si parece un array o JSON string
                            formData[fieldname] = JSON.parse(val);
                        } catch (e) {
                            formData[fieldname] = val;
                        }
                    });

                    busboy.on('finish', () => {
                        console.log('Busboy finished parsing form.');
                        resolve();
                    });

                    busboy.on('error', reject);
                    
                    // Asegúrate de que el body es un Buffer, esencial para busboy
                    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'latin1'));
                });

                // Si se subieron archivos, usa esas URLs. Si no, usa las URLs existentes del campo de texto.
                if (uploadedImageUrls.length > 0) {
                    formData.imagenes = uploadedImageUrls;
                } else if (formData.imagenes && typeof formData.imagenes === 'string') {
                    // Si no se subieron archivos nuevos, pero el campo de texto de URLs estaba lleno
                    formData.imagenes = formData.imagenes.split(',').map(url => url.trim()).filter(url => url !== '');
                } else {
                    formData.imagenes = []; // Si no hay ni archivos ni URLs, es un array vacío
                }

            } else {
                // Si la solicitud es application/json (para actualizaciones sin subir archivos nuevos)
                formData = JSON.parse(event.body);
                if (formData.imagenes && typeof formData.imagenes === 'string') {
                    formData.imagenes = formData.imagenes.split(',').map(url => url.trim()).filter(url => url !== '');
                } else if (!formData.imagenes) {
                    formData.imagenes = [];
                }
            }
        }


        // --- Lógica CRUD para Productos ---
        if (method === 'GET') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            let query = 'SELECT * FROM productos';
            let values = [];

            if (productId) {
                query += ' WHERE id = $1';
                values.push(productId);
            }

            const { rows } = await pool.query(query, values);
            
            const formattedRows = rows.map(row => ({
                id: row.id,
                nombre: row.nombre,
                descripcion: row.descripcion,
                descripcion_corta: row.descripcion_corta,
                precio: parseFloat(row.precio), 
                precioOriginal: row.precio_original ? parseFloat(row.precio_original) : undefined,
                descuento: row.descuento || undefined,
                imagenes: row.imagenes || [], // Debería ser un ARRAY de la DB
                stock: row.stock || 0,
                categoria: row.categoria,
                tipo: row.tipo || 'general'
            }));

            if (productId && formattedRows.length === 0) {
                return {
                    statusCode: 404,
                    headers: headers,
                    body: JSON.stringify({ message: 'Producto no encontrado.' }),
                };
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify(productId ? formattedRows[0] : formattedRows),
            };
        }
        else if (method === 'POST') {
            if (!formData.nombre || formData.precio === undefined) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ message: 'Nombre y precio son campos requeridos.' }),
                };
            }

            // Generación de ID automático y validación de unicidad
            let baseId = formData.nombre.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            let finalId = baseId;
            let counter = 0;
            let idExists = true;

            while (idExists) {
                const checkQuery = 'SELECT id FROM productos WHERE id = $1';
                const { rows } = await pool.query(checkQuery, [finalId]);
                if (rows.length === 0) {
                    idExists = false;
                } else {
                    counter++;
                    finalId = `${baseId}-${counter}`;
                }
            }
            formData.id = finalId; // Asigna el ID generado

            const insertQuery = `
                INSERT INTO productos (id, nombre, descripcion, descripcion_corta, precio, precio_original, descuento, imagenes, stock, categoria, tipo)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *;
            `;
            const values = [
                formData.id,
                formData.nombre,
                formData.descripcion || null,
                formData.descripcion_corta || null,
                formData.precio,
                formData.precioOriginal || null,
                formData.descuento || null,
                formData.imagenes || [], // Usar el array de URLs
                formData.stock || 0,
                formData.categoria || null,
                formData.tipo || 'general'
            ];
            const { rows } = await pool.query(insertQuery, values);
            return {
                statusCode: 201,
                headers: headers,
                body: JSON.stringify({ message: 'Producto creado exitosamente', product: rows[0] }),
            };
        }
        else if (method === 'PUT') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            if (!productId) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ message: 'ID del producto es requerido para actualizar.' }) };
            }
            
            const updates = [];
            const values = [];
            let paramIndex = 1;

            const columnMap = {
                precioOriginal: 'precio_original',
                descripcionCorta: 'descripcion_corta',
                // ya no es necesario 'enOferta' si usamos 'tipo'
            };

            for (const key in formData) { // Usa formData aquí
                if (key === 'id') continue; 
                const dbColumn = columnMap[key] || key.toLowerCase(); 
                updates.push(`${dbColumn} = $${paramIndex++}`);
                values.push(formData[key]);
            }

            if (updates.length === 0) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ message: 'No se proporcionaron datos para actualizar.' }),
                };
            }

            values.push(productId); 

            const updateQuery = `UPDATE productos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;
            const { rows } = await pool.query(updateQuery, values);

            if (rows.length === 0) {
                return { statusCode: 404, headers: headers, body: JSON.stringify({ message: 'Producto no encontrado para actualizar.' }) };
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: 'Producto actualizado exitosamente', product: rows[0] }),
            };
        }
        else if (method === 'DELETE') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            if (!productId) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ message: 'ID del producto es requerido para eliminar.' }) };
            }
            
            const deleteQuery = 'DELETE FROM productos WHERE id = $1 RETURNING id;';
            const { rowCount } = await pool.query(deleteQuery, [productId]);

            if (rowCount === 0) {
                return { statusCode: 404, headers: headers, body: JSON.stringify({ message: 'Producto no encontrado para eliminar.' }) };
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: `Producto con ID ${productId} eliminado exitosamente.` }),
            };
        }
        else {
            return {
                statusCode: 405,
                headers: headers,
                body: JSON.stringify({ message: 'Método no permitido.' }),
            };
        }
    } catch (error) {
        console.error('Error en la función Lambda:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    }
};