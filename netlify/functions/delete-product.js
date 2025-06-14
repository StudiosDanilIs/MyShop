// netlify/functions/delete-product.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const productId = event.queryStringParameters.id;
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
        const query = 'DELETE FROM products WHERE id = $1 RETURNING id;';
        const res = await client.query(query, [productId]);

        if (res.rows.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Product not found for deletion.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: `Product with ID ${productId} deleted successfully.` }),
        };
    } catch (error) {
        console.error('Error deleting product:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to delete product', details: error.message }),
        };
    } finally {
        await client.end();
    }
};