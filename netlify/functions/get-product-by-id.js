// netlify/functions/get-product-by-id.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const productId = event.queryStringParameters.id; // Lee el ID de los parámetros de la URL
    if (!productId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required.' }) };
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database connection string not configured.' }) };
    }

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        const query = 'SELECT * FROM products WHERE id = $1;';
        const res = await client.query(query, [productId]);

        if (res.rows.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Product not found.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(res.rows[0]),
        };
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to fetch product', details: error.message }),
        };
    } finally {
        await client.end();
    }
};