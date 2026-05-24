const express = require('express');
const { query, execSP, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/rescue/teams
router.get('/teams', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT rt.teamID, rt.teamName, rt.teamType, rt.currentLocation,
              rt.availabilityStatus, rt.capacity,
              ta.assignmentID, ta.assignedAt,
              er.location AS assignedToLocation, er.severityLevel AS incidentSeverity
       FROM Rescue_Team rt
       LEFT JOIN Team_Assignment ta
         ON rt.teamID = ta.teamID AND ta.status NOT IN ('Completed','Cancelled')
       LEFT JOIN Emergency_Report er ON ta.reportID = er.reportID
       ORDER BY
         CASE rt.availabilityStatus
           WHEN 'Available' THEN 1 WHEN 'Assigned' THEN 2
           WHEN 'Busy'      THEN 3 ELSE 4
         END`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/rescue/assignments
router.get('/assignments', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT ta.assignmentID, ta.assignedAt, ta.completedAt, ta.status,
              rt.teamName, rt.teamType,
              er.location AS incidentLocation, er.severityLevel,
              u.name AS assignedByName
       FROM Team_Assignment ta
       JOIN Rescue_Team      rt ON ta.teamID     = rt.teamID
       JOIN Emergency_Report er ON ta.reportID   = er.reportID
       JOIN [User]           u  ON ta.assignedBy = u.userID
       ORDER BY ta.assignedAt DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rescue/assign  — calls sp_AssignRescueTeam
router.post('/assign', auth, rbac('Admin', 'Field Officer'), async (req, res) => {
    try {
        const { teamID, reportID, notes } = req.body;
        if (!teamID || !reportID)
            return res.status(400).json({ error: 'teamID and reportID are required' });

        const { output } = await execSP(
            'sp_AssignRescueTeam',
            {
                teamID:       { type: sql.Int,          val: parseInt(teamID)    },
                reportID:     { type: sql.Int,          val: parseInt(reportID)  },
                assignedByID: { type: sql.Int,          val: req.user.userID     },
                notes:        { type: sql.VarChar(200), val: notes || null       },
            },
            { newAssignID: { type: sql.Int } }
        );

        res.status(201).json({
            assignmentID: output.newAssignID,
            message: 'Team assignment submitted for approval',
        });
    } catch (err) {
        // Catch the "team not available" raiserror from the SP
        res.status(400).json({ error: err.message });
    }
});

// PATCH /api/rescue/assignments/:id  — update assignment status
router.patch('/assignments/:id', auth, rbac('Admin', 'Field Officer'), async (req, res) => {
    try {
        const { status } = req.body;
        await query(
            `UPDATE Team_Assignment
       SET status = @status,
           completedAt = CASE WHEN @status IN ('Completed','Cancelled') THEN GETDATE() ELSE completedAt END
       WHERE assignmentID = @id`,
            {
                status: { type: sql.VarChar(20), val: status               },
                id:     { type: sql.Int,         val: parseInt(req.params.id) },
            }
        );
        res.json({ message: 'Assignment updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;