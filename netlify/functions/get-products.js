const { Client } = require('pg');

exports.handler = async (event, context) => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Para desarrollo local/pruebas. En producción, considera `true` si Neon lo requiere y tienes la CA Root de Neon.
    });

    try {
        await client.connect();
        const result = await client.query('SELECT * FROM productos ORDER BY nombre ASC');
        
        // Mapea los nombres de las columnas de snake_case a camelCase para el frontend
        const products = result.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            descripcion: row.descripcion,
            descripcionCorta: row.descripcion_corta, // camelCase
            precio: parseFloat(row.precio),
            imagenes: row.imagenes, // Asume que PostgreSQL maneja TEXT[] y Node.js lo convierte a array
            stock: row.stock,
            categoria: row.categoria,
            destacado: row.destacado,
            enOferta: row.en_oferta, // camelCase
            precioOriginal: row.precio_original ? parseFloat(row.precio_original) : null,
            descuento: row.descuento
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al obtener productos', details: error.message }),
        };
    } finally {
        if (client) {
            await client.end();
        }
    }
};