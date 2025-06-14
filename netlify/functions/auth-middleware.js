const authorize = (event) => {
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;
    const authHeader = event.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, statusCode: 401, message: 'Authentication token missing or malformed.' };
    }

    const token = authHeader.split(' ')[1];

    if (token !== adminSecretKey) {
        return { authorized: false, statusCode: 403, message: 'Unauthorized: Invalid token.' };
    }

    return { authorized: true };
};

module.exports = { authorize };