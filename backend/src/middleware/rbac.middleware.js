// Usage in routes: router.get('/path', auth, rbac('Admin','Operator'), handler)
module.exports = function rbac(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
        }
        next();
    };
};