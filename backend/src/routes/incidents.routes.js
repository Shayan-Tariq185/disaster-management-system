const express = require('express');
const { query, sql } = require('../config/db');
const auth  = require('../middleware/auth.middleware');
const rbac  = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/incidents  — list all (with optional filters)
router.get('/', auth, async (req, res) => {
    try {
        const { severity, status, eventID } = req.query;

        let where = 'WHERE 1=1';
        const params = {};

        if (severity) {
            where += ' AND er.severityLevel = @severity';
            params.severity = { type: sql.VarChar(20), val: severity };
        }
        if (status) {
            where += ' AND er.status = @status';
            params.status = { type: sql.VarChar(20), val: status };
        }
        if (eventID) {
            where += ' AND er.eventID = @eventID';
            params.eventID = { type: sql.Int, val: parseInt(eventID) };
        }

        const rows = await query(
            `SELECT er.reportID, er.location, er.disasterType, er.severityLevel,
              er.timeOfReport, er.status,
              de.eventName,
              c.name  AS citizenName,  c.phone AS citizenPhone,
              u.name  AS operatorName
       FROM Emergency_Report er
       LEFT JOIN Disaster_Event de ON er.eventID    = de.eventID
       LEFT JOIN Citizen         c  ON er.citizenID = c.citizenID
       LEFT JOIN [User]          u  ON er.operatorID = u.userID
       ${where}
       ORDER BY
         CASE er.severityLevel
           WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
           WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4 ELSE 5
         END,
         er.timeOfReport DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/incidents/:id  — single incident
router.get('/:id', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT er.*, de.eventName, c.name AS citizenName, c.phone AS citizenPhone,
              u.name AS operatorName
       FROM Emergency_Report er
       LEFT JOIN Disaster_Event de ON er.eventID    = de.eventID
       LEFT JOIN Citizen         c  ON er.citizenID = c.citizenID
       LEFT JOIN [User]          u  ON er.operatorID = u.userID
       WHERE er.reportID = @id`,
            { id: { type: sql.Int, val: parseInt(req.params.id) } }
        );
        if (!rows.length) return res.status(404).json({ error: 'Incident not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/incidents  — create new report
router.post('/', auth, rbac('Admin', 'Operator'), async (req, res) => {
    try {
        const { eventID, location, disasterType, severityLevel, description, citizenContact } = req.body;

        if (!eventID || !location || !severityLevel)
            return res.status(400).json({ error: 'eventID, location, and severityLevel are required' });

        // Verify event exists and get its disaster type
        const eventRows = await query(
            `SELECT eventID, disasterType, status FROM Disaster_Event WHERE eventID = @eid`,
            { eid: { type: sql.Int, val: parseInt(eventID) } }
        );
        if (!eventRows.length) 
            return res.status(400).json({ error: 'Disaster Event not found' });

        const eventDisasterType = eventRows[0].disasterType;

        // Upsert citizen if contact provided
        let citizenID = null;
        if (citizenContact) {
            const cRows = await query(
                `SELECT citizenID FROM Citizen WHERE phone = @phone`,
                { phone: { type: sql.VarChar(20), val: citizenContact } }
            );
            if (cRows.length) {
                citizenID = cRows[0].citizenID;
            } else {
                const ins = await query(
                    `INSERT INTO Citizen (name, phone) VALUES (@name, @phone); SELECT SCOPE_IDENTITY() AS citizenID;`,
                    {
                        name:  { type: sql.VarChar(100), val: 'Unknown Caller'  },
                        phone: { type: sql.VarChar(20),  val: citizenContact     },
                    }
                );
                citizenID = ins[0].citizenID;
            }
        }

        const result = await query(
            `INSERT INTO Emergency_Report
         (citizenID, eventID, operatorID, location, disasterType, severityLevel, status)
       VALUES (@cid, @eid, @oid, @loc, @dtype, @sev, 'Pending');
       SELECT SCOPE_IDENTITY() AS reportID;`,
            {
                cid:   { type: sql.Int,          val: citizenID                },
                eid:   { type: sql.Int,          val: parseInt(eventID)        },
                oid:   { type: sql.Int,          val: req.user.userID          },
                loc:   { type: sql.VarChar(200), val: location                 },
                dtype: { type: sql.VarChar(50),  val: eventDisasterType        },
                sev:   { type: sql.VarChar(20),  val: severityLevel            },
            }
        );

        res.status(201).json({
            reportID: result[0].reportID,
            message:  'Incident reported successfully',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/incidents/:id/status  — update status
router.patch('/:id/status', auth, rbac('Admin', 'Operator'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Verified', 'Assigned', 'Resolved', 'Cancelled'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });

        await query(
            `UPDATE Emergency_Report SET status = @status WHERE reportID = @id`,
            {
                status: { type: sql.VarChar(20), val: status               },
                id:     { type: sql.Int,         val: parseInt(req.params.id) },
            }
        );

        // Manual audit log (trigger handles DB-level, this is belt-and-suspenders)
        await query(
            `INSERT INTO Audit_Log (userID, actionType, tableAffected, recordID, newValue)
       VALUES (@uid, 'UPDATE', 'Emergency_Report', @rid, @status)`,
            {
                uid:    { type: sql.Int,         val: req.user.userID          },
                rid:    { type: sql.Int,         val: parseInt(req.params.id)  },
                status: { type: sql.VarChar(200),val: status                   },
            }
        );

        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/incidents/events/list  — disaster events for dropdowns
router.get('/events/list', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT eventID, eventName, disasterType, status FROM Disaster_Event ORDER BY startDate DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;