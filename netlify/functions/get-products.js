// netlify/functions/get-products.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
    // Asegúrate de que esta variable de entorno esté configurada en Netlify
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database connection string not configured.' }),
        };
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false // NECESARIO para Neon en Netlify
        }
    });

    try {
        await client.connect();
        const result = await client.query('SELECT * FROM products'); // Obtiene todos los productos
        const products = result.rows;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Permite solicitudes desde cualquier origen (ajusta en producción)
            },
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error('Error fetching products from database:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Failed to fetch products', details: error.message }),
        };
    } finally {
        await client.end(); // Siempre cierra la conexión
    }
};