// netlify/functions/products.js
const { Pool } = require('@neondatabase/serverless');

// La cadena de conexión se obtiene de las variables de entorno de Netlify
// ¡IMPORTANTE!: Asegúrate de que esta variable de entorno 'DATABASE_URL' esté configurada en Netlify.
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

exports.handler = async function(event, context) {
    // Permite CORS para que tu frontend pueda hacer peticiones a la función
    const headers = {
        'Access-Control-Allow-Origin': '*', // Permite cualquier origen (ajusta para producción)
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Manejar pre-vuelos de CORS (OPTIONS requests)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: ''
        };
    }

    const method = event.httpMethod;
    const path = event.path; // Ejemplo: '/.netlify/functions/products'

    try {
        // Nos aseguramos de que la petición sea a la ruta correcta de la función
        if (!path.startsWith('/.netlify/functions/products')) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: 'Ruta de API no encontrada.' }),
            };
        }

        if (method === 'GET') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            let query = 'SELECT * FROM productos';
            let values = [];

            if (productId) {
                query += ' WHERE id = $1';
                values.push(productId);
            }

            const { rows } = await pool.query(query, values);
            
            // Formatear los resultados de snake_case a camelCase para el frontend
            const formattedRows = rows.map(row => ({
                id: row.id,
                nombre: row.nombre,
                descripcion: row.descripcion,
                descripcion_corta: row.descripcion_corta,
                precio: parseFloat(row.precio), 
                precioOriginal: row.precio_original ? parseFloat(row.precio_original) : undefined,
                descuento: row.descuento || undefined,
                imagenes: row.imagenes || [], // Asegúrate de que las imágenes vienen como array
                stock: row.stock || 0,
                categoria: row.categoria,
                destacado: row.destacado,
                enOferta: row.en_oferta
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
        // --- AQUÍ IRÍAN LAS OPERACIONES CRUD RESTANTES (POST, PUT, DELETE) ---
        // Para añadir productos (POST):
        else if (method === 'POST') {
            const data = JSON.parse(event.body);
            // Implementa validación y lógica de inserción aquí
            // Ejemplo básico (requiere más validación en producción):
            const insertQuery = `
                INSERT INTO productos (id, nombre, descripcion, descripcion_corta, precio, precio_original, descuento, imagenes, stock, categoria, destacado, en_oferta)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *;
            `;
            const values = [
                data.id,
                data.nombre,
                data.descripcion || null,
                data.descripcion_corta || null,
                data.precio,
                data.precioOriginal || null,
                data.descuento || null,
                data.imagenes || [],
                data.stock || 0,
                data.categoria || null,
                data.destacado || false,
                data.enOferta || false
            ];
            const { rows } = await pool.query(insertQuery, values);
            return {
                statusCode: 201,
                headers: headers,
                body: JSON.stringify({ message: 'Producto creado exitosamente', product: rows[0] }),
            };
        }
        // Para actualizar productos (PUT):
        else if (method === 'PUT') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            if (!productId) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ message: 'ID del producto es requerido para actualizar.' }) };
            }
            const data = JSON.parse(event.body);
            // Implementa lógica de actualización aquí
            const updates = [];
            const values = [];
            let paramIndex = 1;

            for (const key in data) {
                const dbColumn = {
                    precioOriginal: 'precio_original',
                    enOferta: 'en_oferta',
                    descripcionCorta: 'descripcion_corta'
                }[key] || key.toLowerCase(); 

                updates.push(`${dbColumn} = $${paramIndex++}`);
                values.push(data[key]);
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
        // Para eliminar productos (DELETE):
        else if (method === 'DELETE') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            if (!productId) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ message: 'ID del producto es requerido para eliminar.' }) };
            }
            // Implementa lógica de eliminación aquí
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