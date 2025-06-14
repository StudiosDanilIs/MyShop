const { Client } = require('pg');
const { authorize } = require('./auth-middleware'); // Importa el middleware de autenticación

exports.handler = async (event, context) => {
    // 1. Autenticación
    const authResult = authorize(event);
    if (!authResult.authorized) {
        return { statusCode: authResult.statusCode, body: JSON.stringify({ error: authResult.message }) };
    }

    // 2. Método HTTP
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const productId = event.queryStringParameters.id;
    if (!productId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required for update.' }) };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const product = JSON.parse(event.body);

        // Validación básica
        if (!product.nombre || product.precio === undefined || product.precio === null) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Nombre y precio son requeridos para la actualización.' }) };
        }
        if (isNaN(parseFloat(product.precio))) {
             return { statusCode: 400, body: JSON.stringify({ error: 'El precio debe ser un número válido.' }) };
        }

        const query = `
            UPDATE productos
            SET
                nombre = $1,
                descripcion = $2,
                descripcion_corta = $3,
                precio = $4,
                imagenes = $5,
                stock = $6,
                categoria = $7,
                destacado = $8,
                en_oferta = $9,
                precio_original = $10,
                descuento = $11
            WHERE id = $12
            RETURNING *;
        `;
        const values = [
            product.nombre,
            product.descripcion || null,
            product.descripcionCorta || null, // Mapeo de camelCase a snake_case
            parseFloat(product.precio),
            Array.isArray(product.imagenes) ? product.imagenes : [],
            parseInt(product.stock) || 0,
            product.categoria || null,
            Boolean(product.destacado) || false,
            Boolean(product.enOferta) || false, // Mapeo de camelCase a snake_case
            product.precioOriginal ? parseFloat(product.precioOriginal) : null,
            product.descuento ? parseInt(product.descuento) : null,
            productId // El ID para la cláusula WHERE
        ];

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Producto no encontrado.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result.rows[0]),
        };
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al actualizar producto', details: error.message }),
        };
    } finally {
        if (client) {
            await client.end();
        }
    }
};