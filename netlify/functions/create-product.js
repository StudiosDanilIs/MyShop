// netlify/functions/create-product.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
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
            INSERT INTO products (
                id, nombre, descripcion, descripcion_corta, precio, precioOriginal,
                descuento, imagenes, stock, categoria, destacado, enOferta
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [
            product.id,
            product.nombre,
            product.descripcion,
            product.descripcion_corta,
            product.precio,
            product.precioOriginal,
            product.descuento,
            product.imagenes, // Asumimos que es un array de strings desde el frontend
            product.stock,
            product.categoria,
            product.destacado,
            product.enOferta
        ];
        const res = await client.query(query, values);
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(res.rows[0]),
        };
    } catch (error) {
        console.error('Error creating product:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to create product', details: error.message }),
        };
    } finally {
        await client.end();
    }
};