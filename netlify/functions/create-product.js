const { Client } = require('pg');
const { authorize } = require('./auth-middleware'); // Importa el middleware de autenticación

exports.handler = async (event, context) => {
    // 1. Autenticación
    const authResult = authorize(event);
    if (!authResult.authorized) {
        return { statusCode: authResult.statusCode, body: JSON.stringify({ error: authResult.message }) };
    }

    // 2. Método HTTP
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const product = JSON.parse(event.body);

        // Validación básica
        if (!product.id || !product.nombre || product.precio === undefined || product.precio === null) {
            return { statusCode: 400, body: JSON.stringify({ error: 'ID, nombre y precio son requeridos.' }) };
        }
        if (isNaN(parseFloat(product.precio))) {
             return { statusCode: 400, body: JSON.stringify({ error: 'El precio debe ser un número válido.' }) };
        }


        const query = `
            INSERT INTO productos (
                id, nombre, descripcion, descripcion_corta, precio, imagenes, stock, 
                categoria, destacado, en_oferta, precio_original, descuento
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [
            product.id,
            product.nombre,
            product.descripcion || null,
            product.descripcionCorta || null, // Mapeo de camelCase a snake_case para la DB
            parseFloat(product.precio),
            Array.isArray(product.imagenes) ? product.imagenes : [], // Asegurarse que es un array
            parseInt(product.stock) || 0,
            product.categoria || null,
            Boolean(product.destacado) || false,
            Boolean(product.enOferta) || false, // Mapeo de camelCase a snake_case
            product.precioOriginal ? parseFloat(product.precioOriginal) : null,
            product.descuento ? parseInt(product.descuento) : null
        ];

        const result = await client.query(query, values);
        const createdProduct = result.rows[0];

        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createdProduct),
        };
    } catch (error) {
        console.error('Error al crear producto:', error);
        if (error.code === '23505') { // Código de error de PostgreSQL para violación de clave primaria (ID duplicado)
            return {
                statusCode: 409, // Conflict
                body: JSON.stringify({ error: 'Error: Ya existe un producto con este ID.', details: error.message }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al crear producto', details: error.message }),
        };
    } finally {
        if (client) {
            await client.end();
        }
    }
};