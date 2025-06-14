// netlify/functions/products.js
const { Pool } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', // 'X-Admin-Key' ELIMINADO
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: headers,
            body: ''
        };
    }

    const method = event.httpMethod;
    const path = event.path;

    try {
        if (!path.startsWith('/.netlify/functions/products')) {
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: 'Ruta de API no encontrada.' }),
            };
        }

        // Lógica de seguridad para ADMIN_SECRET_KEY ELIMINADA de aquí

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
                imagenes: row.imagenes || [], 
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
        else if (method === 'POST') {
            const data = JSON.parse(event.body);
            if (!data.id || !data.nombre || data.precio === undefined) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ message: 'ID, nombre y precio son campos requeridos.' }),
                };
            }

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
        else if (method === 'PUT') {
            const productId = event.queryStringParameters ? event.queryStringParameters.id : null;
            if (!productId) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ message: 'ID del producto es requerido para actualizar.' }) };
            }
            const data = JSON.parse(event.body);
            const updates = [];
            const values = [];
            let paramIndex = 1;

            const columnMap = {
                precioOriginal: 'precio_original',
                descripcionCorta: 'descripcion_corta',
                enOferta: 'en_oferta',
            };

            for (const key in data) {
                if (key === 'id') continue; 
                const dbColumn = columnMap[key] || key.toLowerCase(); 
                updates.push(`${dbColumn} = $${paramIndex++}`);
                values.push(data[key]);
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