const express = require('express');
const { query, execSP, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/resources/inventory  — uses v_ResourceInventorySummary view
router.get('/inventory', auth, async (req, res) => {
    try {
        const { warehouseID, resourceType } = req.query;
        let where = 'WHERE 1=1';
        const params = {};

        if (warehouseID) {
            where += ' AND warehouseID = @wid';
            params.wid = { type: sql.Int, val: parseInt(warehouseID) };
        }
        if (resourceType) {
            where += ' AND resourceType = @rtype';
            params.rtype = { type: sql.VarChar(50), val: resourceType };
        }

        // Use the view for clean output
        const rows = await query(
            `SELECT * FROM v_ResourceInventorySummary
       ${where}
       ORDER BY stockStatus DESC, warehouseName`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/resources/warehouses
router.get('/warehouses', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT w.warehouseID, w.name, w.location, w.contactInfo, u.name AS managerName
       FROM Warehouse w LEFT JOIN [User] u ON w.managerID = u.userID
       ORDER BY w.name`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/resources/allocations  — uses v_AllocationStatus view
router.get('/allocations', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const rows = await query(
            `SELECT * FROM v_AllocationStatus
       ${status ? 'WHERE allocationStatus = @status' : ''}
       ORDER BY allocationDate DESC`,
            status ? { status: { type: sql.VarChar(20), val: status } } : {}
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/resources/allocate  — calls sp_AllocateResource
router.post('/allocate', auth, rbac('Admin', 'Warehouse Manager'), async (req, res) => {
    try {
        const { inventoryID, reportID, quantity, notes } = req.body;
        if (!inventoryID || !reportID || !quantity)
            return res.status(400).json({ error: 'inventoryID, reportID, and quantity are required' });

        const { output } = await execSP(
            'sp_AllocateResource',
            {
                inventoryID:  { type: sql.Int,          val: parseInt(inventoryID)  },
                reportID:     { type: sql.Int,          val: parseInt(reportID)     },
                allocatedBy:  { type: sql.Int,          val: req.user.userID        },
                quantity:     { type: sql.Decimal(10,2), val: parseFloat(quantity)  },
                notes:        { type: sql.VarChar(200), val: notes || null          },
            },
            { newAllocID: { type: sql.Int } }
        );

        res.status(201).json({
            allocationID: output.newAllocID,
            message: 'Resource allocation request submitted for approval',
        });
    } catch (err) {
        // Catches RAISERROR from trigger (insufficient stock)
        res.status(400).json({ error: err.message });
    }
});

// GET /api/resources/low-stock  — items below threshold
router.get('/low-stock', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT * FROM v_ResourceInventorySummary
       WHERE stockStatus IN ('Low Stock', 'Out of Stock')
       ORDER BY stockStatus DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;