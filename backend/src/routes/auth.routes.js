const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { query, sql } = require('../config/db');
const auth      = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required' });

        // Fetch user + role name
        const rows = await query(
            `SELECT u.userID, u.name, u.email, u.passwordHash, u.isActive,
              r.roleName as role, u.roleID
       FROM [User] u
       LEFT JOIN Role r ON u.roleID = r.roleID
       WHERE u.email = @email`,
            { email: { type: sql.VarChar(100), val: email } }
        );

        if (!rows.length)
            return res.status(401).json({ error: 'Invalid email or password' });

        const user = rows[0];

        if (!user.isActive)
            return res.status(403).json({ error: 'Account is deactivated' });

        // Compare password — works with both bcrypt hashes and plain-text dev passwords
        let valid = false;
        if (user.passwordHash.startsWith('$2')) {
            valid = await bcrypt.compare(password, user.passwordHash);
        } else {
            // Plain-text comparison for dev seed data (e.g. 'admin123')
            valid = password === user.passwordHash;
        }

        if (!valid)
            return res.status(401).json({ error: 'Invalid email or password' });

        const payload = {
            userID: user.userID,
            name:   user.name,
            email:  user.email,
            role:   user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        });

        // Log login to Audit_Log
        await query(
            `INSERT INTO Audit_Log (userID, actionType, tableAffected, recordID, newValue)
       VALUES (@uid, 'LOGIN', 'User', @uid, @email)`,
            {
                uid:   { type: sql.Int,         val: user.userID },
                email: { type: sql.VarChar(200), val: user.email  },
            }
        );

        res.json({
            user:  { id: user.userID, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET /api/auth/me   — verify token and return current user
router.get('/me', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT u.userID as id, u.name, u.email, r.roleName as role
       FROM [User] u LEFT JOIN Role r ON u.roleID = r.roleID
       WHERE u.userID = @uid`,
            { uid: { type: sql.Int, val: req.user.userID } }
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;