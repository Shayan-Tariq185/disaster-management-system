const express = require('express');
const { query, execSP, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/approvals  — uses v_PendingApprovals + full list
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;

        // If user is not Admin, only return their own requests
        const isAdmin = req.user.role === 'Admin';

        let where = 'WHERE 1=1';
        const params = {};

        if (status) {
            where += ' AND ar.status = @status';
            params.status = { type: sql.VarChar(20), val: status };
        }
        if (!isAdmin) {
            where += ' AND ar.requestedBy = @uid';
            params.uid = { type: sql.Int, val: req.user.userID };
        }

        const rows = await query(
            `SELECT ar.requestID, ar.requestType, ar.referenceType, ar.referenceID,
              ar.status, ar.requestDate, ar.decisionDate, ar.comments,
              u1.name AS requestedByName, r1.roleName AS requestedByRole,
              u2.name AS approvedByName
       FROM Approval_Request ar
       JOIN  [User] u1 ON ar.requestedBy = u1.userID
       JOIN  Role   r1 ON u1.roleID      = r1.roleID
       LEFT JOIN [User] u2 ON ar.approvedBy = u2.userID
       ${where}
       ORDER BY
         CASE ar.status WHEN 'Pending' THEN 0 ELSE 1 END,
         ar.requestDate DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/approvals/:id  — calls sp_ProcessApproval
router.patch('/:id', auth, rbac('Admin'), async (req, res) => {
    try {
        const { action, comments } = req.body;   // action = 'Approved' | 'Rejected'
        if (!['Approved', 'Rejected'].includes(action))
            return res.status(400).json({ error: 'action must be Approved or Rejected' });

        await execSP('sp_ProcessApproval', {
            requestID:  { type: sql.Int,          val: parseInt(req.params.id) },
            approverID: { type: sql.Int,          val: req.user.userID         },
            decision:   { type: sql.VarChar(20),  val: action                  },
            comments:   { type: sql.VarChar(200), val: comments || null        },
        });

        res.json({ message: `Request ${action.toLowerCase()} successfully` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;