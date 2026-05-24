const express = require('express');
const { query, execSP, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/finance/transactions
router.get('/transactions', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const { type, eventID, fromDate, toDate } = req.query;
        let where = 'WHERE 1=1';
        const params = {};
        if (type)     { where += ' AND ft.transactionType = @type'; params.type = { type: sql.VarChar(20), val: type }; }
        if (eventID)  { where += ' AND ft.eventID = @eid';         params.eid  = { type: sql.Int,         val: parseInt(eventID) }; }
        if (fromDate) { where += ' AND ft.transactionDate >= @from';params.from = { type: sql.DateTime,    val: new Date(fromDate) }; }
        if (toDate)   { where += ' AND ft.transactionDate <= @to';  params.to   = { type: sql.DateTime,    val: new Date(toDate) }; }

        const rows = await query(
            `SELECT ft.transactionID, ft.transactionType, ft.amount, ft.transactionDate,
              ft.referenceID,   de.eventName,
              u.name AS recordedByName
       FROM Financial_Transaction ft
       JOIN Disaster_Event de ON ft.eventID    = de.eventID
       LEFT JOIN [User]    u  ON ft.recordedBy = u.userID
       ${where}
       ORDER BY ft.transactionDate DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/finance/summary  — uses v_FinancialSummary view
router.get('/summary', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM v_FinancialSummary ORDER BY eventID`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/finance/donations  — calls sp_RecordDonation
router.post('/donations', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const { eventID, donorName, donorType, amount, paymentMethod } = req.body;
        if (!eventID || !amount)
            return res.status(400).json({ error: 'eventID and amount are required' });

        const { output } = await execSP(
            'sp_RecordDonation',
            {
                eventID:       { type: sql.Int,           val: parseInt(eventID)    },
                receivedBy:    { type: sql.Int,           val: req.user.userID      },
                donorName:     { type: sql.VarChar(100),  val: donorName  || null   },
                donorType:     { type: sql.VarChar(50),   val: donorType  || null   },
                amount:        { type: sql.Decimal(18,2), val: parseFloat(amount)   },
                paymentMethod: { type: sql.VarChar(50),   val: paymentMethod || null},
            },
            { newDonationID: { type: sql.Int } }
        );

        res.status(201).json({
            donationID: output.newDonationID,
            message:    'Donation recorded. Financial transaction auto-created.',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/finance/expenses  — calls sp_RecordExpense
router.post('/expenses', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const { eventID, description, category, amount } = req.body;
        if (!eventID || !amount)
            return res.status(400).json({ error: 'eventID and amount are required' });

        const { output } = await execSP(
            'sp_RecordExpense',
            {
                eventID:     { type: sql.Int,           val: parseInt(eventID)    },
                recordedBy:  { type: sql.Int,           val: req.user.userID      },
                description: { type: sql.VarChar(255),  val: description || null  },
                category:    { type: sql.VarChar(50),   val: category    || null  },
                amount:      { type: sql.Decimal(18,2), val: parseFloat(amount)   },
            },
            { newExpenseID: { type: sql.Int } }
        );

        res.status(201).json({
            expenseID: output.newExpenseID,
            message:   'Expense recorded. Approval request created if amount > ₨100,000.',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;