const express = require('express');
const bcrypt  = require('bcryptjs');
const { query, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/users  — all users (Admin only)
router.get('/', auth, rbac('Admin'), async (req, res) => {
    try {
        const rows = await query(
            `SELECT u.userID AS id, u.name, u.email, r.roleName AS role,
              u.isActive, u.createdAt
       FROM [User] u LEFT JOIN Role r ON u.roleID = r.roleID
       ORDER BY u.createdAt DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users  — create user (Admin only)
router.post('/', auth, rbac('Admin'), async (req, res) => {
    try {
        const { name, email, password, roleName } = req.body;
        if (!name || !email || !password || !roleName)
            return res.status(400).json({ error: 'name, email, password, and roleName are required' });

        // Check email unique
        const existing = await query(
            `SELECT userID FROM [User] WHERE email = @email`,
            { email: { type: sql.VarChar(100), val: email } }
        );
        if (existing.length) return res.status(409).json({ error: 'Email already exists' });

        // Get roleID
        const roleRows = await query(
            `SELECT roleID FROM Role WHERE roleName = @rname`,
            { rname: { type: sql.VarChar(50), val: roleName } }
        );
        if (!roleRows.length) return res.status(400).json({ error: 'Invalid role name' });

        const hash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO [User] (name, email, roleID, isActive, passwordHash)
       VALUES (@name, @email, @rid, 1, @hash);
       SELECT SCOPE_IDENTITY() AS userID;`,
            {
                name:  { type: sql.VarChar(100), val: name               },
                email: { type: sql.VarChar(100), val: email              },
                rid:   { type: sql.Int,          val: roleRows[0].roleID },
                hash:  { type: sql.VarChar(200), val: hash               },
            }
        );
        res.status(201).json({ userID: result[0].userID, message: 'User created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:id/toggle  — enable/disable user
router.patch('/:id/toggle', auth, rbac('Admin'), async (req, res) => {
    try {
        await query(
            `UPDATE [User] SET isActive = ~isActive WHERE userID = @id`,
            { id: { type: sql.Int, val: parseInt(req.params.id) } }
        );
        res.json({ message: 'User status toggled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/roles  — list roles for dropdown
router.get('/roles', auth, async (req, res) => {
    try {
        const rows = await query(`SELECT roleID, roleName FROM Role ORDER BY roleID`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;