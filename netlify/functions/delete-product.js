const { Client } = require('pg');
const { authorize } = require('./auth-middleware'); // Importa el middleware de autenticación

exports.handler = async (event, context) => {
    // 1. Autenticación
    const authResult = authorize(event);
    if (!authResult.authorized) {
        return { statusCode: authResult.statusCode, body: JSON.stringify({ error: authResult.message }) };
    }

    // 2. Método HTTP
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const productId = event.queryStringParameters.id;
    if (!productId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required for deletion.' }) };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const query = 'DELETE FROM productos WHERE id = $1 RETURNING id;';
        const result = await client.query(query, [productId]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Producto no encontrado para eliminar.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Producto eliminado exitosamente.', id: productId }),
        };
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al eliminar producto', details: error.message }),
        };
    } finally {
        if (client) {
            await client.end();
        }
    }
};