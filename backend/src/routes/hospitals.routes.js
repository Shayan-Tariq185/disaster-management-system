const express = require('express');
const { query, execSP, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/hospitals  — uses v_HospitalCapacity view
router.get('/', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT * FROM v_HospitalCapacity ORDER BY occupancyPct DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hospitals/patients
router.get('/patients', auth, async (req, res) => {
    try {
        const { hospitalID, status } = req.query;
        let where = 'WHERE 1=1';
        const params = {};
        if (hospitalID) {
            where += ' AND p.hospitalID = @hid';
            params.hid = { type: sql.Int, val: parseInt(hospitalID) };
        }
        if (status) {
            where += ' AND p.status = @status';
            params.status = { type: sql.VarChar(20), val: status };
        }

        const rows = await query(
            `SELECT p.patientID, p.patientName, p.caseSeverity, p.admissionDate,
              p.dischargeDate, p.status,
              h.hospitalName, h.location AS hospitalLocation,
              er.location AS incidentLocation
       FROM Patient p
       JOIN Hospital h ON p.hospitalID = h.hospitalID
       LEFT JOIN Emergency_Report er ON p.reportID = er.reportID
       ${where}
       ORDER BY p.admissionDate DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hospitals/admit  — calls sp_AdmitPatient
router.post('/admit', auth, rbac('Admin', 'Operator'), async (req, res) => {
    try {
        const { hospitalID, reportID, patientName, caseSeverity } = req.body;
        if (!hospitalID || !patientName || !caseSeverity)
            return res.status(400).json({ error: 'hospitalID, patientName, and caseSeverity are required' });

        const { output } = await execSP(
            'sp_AdmitPatient',
            {
                reportID:     { type: sql.Int,          val: reportID ? parseInt(reportID) : null },
                hospitalID:   { type: sql.Int,          val: parseInt(hospitalID)                 },
                patientName:  { type: sql.VarChar(100), val: patientName                          },
                caseSeverity: { type: sql.VarChar(20),  val: caseSeverity                         },
            },
            { newPatientID: { type: sql.Int } }
        );

        res.status(201).json({
            patientID: output.newPatientID,
            message:   'Patient admitted. Bed count updated automatically.',
        });
    } catch (err) {
        // Catches "no available beds" from trigger
        res.status(400).json({ error: err.message });
    }
});

// PATCH /api/hospitals/patients/:id/discharge
router.patch('/patients/:id/discharge', auth, rbac('Admin', 'Operator'), async (req, res) => {
    try {
        await query(
            `UPDATE Patient
       SET status = 'Discharged', dischargeDate = GETDATE()
       WHERE patientID = @id`,
            { id: { type: sql.Int, val: parseInt(req.params.id) } }
        );
        res.json({ message: 'Patient discharged. Bed released.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;