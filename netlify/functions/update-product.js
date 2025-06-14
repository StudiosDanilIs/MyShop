// netlify/functions/update-product.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const productId = event.queryStringParameters.id; // O se puede obtener del body, depende de cómo lo envíes
    if (!productId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required.' }) };
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database connection string not configured.' }) };
    }

    const product = JSON.parse(event.body);
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        const query = `
            UPDATE products
            SET
                nombre = $2,
                descripcion = $3,
                descripcion_corta = $4,
                precio = $5,
                precioOriginal = $6,
                descuento = $7,
                imagenes = $8,
                stock = $9,
                categoria = $10,
                destacado = $11,
                enOferta = $12
            WHERE id = $1
            RETURNING *;
        `;
        const values = [
            productId, // El ID para la condición WHERE
            product.nombre,
            product.descripcion,
            product.descripcion_corta,
            product.precio,
            product.precioOriginal,
            product.descuento,
            product.imagenes,
            product.stock,
            product.categoria,
            product.destacado,
            product.enOferta
        ];
        const res = await client.query(query, values);

        if (res.rows.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Product not found for update.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(res.rows[0]),
        };
    } catch (error) {
        console.error('Error updating product:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to update product', details: error.message }),
        };
    } finally {
        await client.end();
    }
};