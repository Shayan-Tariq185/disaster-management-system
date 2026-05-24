const express = require('express');
const { query, sql } = require('../config/db');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const router = express.Router();

// GET /api/reports/dashboard-stats  — admin KPI cards
router.get('/dashboard-stats', auth, rbac('Admin'), async (req, res) => {
    try {
        const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM Emergency_Report WHERE status NOT IN ('Resolved','Closed'))  AS activeIncidents,
        (SELECT COUNT(*) FROM Emergency_Report WHERE severityLevel = 'Critical'
             AND status NOT IN ('Resolved','Closed'))                                       AS criticalIncidents,
        (SELECT COUNT(*) FROM Rescue_Team WHERE availabilityStatus IN ('Assigned','Busy')) AS activeTeams,
        (SELECT COUNT(*) FROM v_ResourceInventorySummary WHERE stockStatus != 'Normal')    AS lowStockAlerts,
        (SELECT COUNT(*) FROM Approval_Request WHERE status = 'Pending')                   AS pendingApprovals,
        (SELECT ISNULL(SUM(amount),0) FROM Donation
              WHERE MONTH(donationDate) = MONTH(GETDATE()))                                 AS donationsThisMonth,
        (SELECT COUNT(*) FROM Audit_Log
              WHERE CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE))                     AS auditEventsToday
    `);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/incidents  — incidents grouped by type & severity
router.get('/incidents', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const rows = await query(
            `SELECT disasterType, severityLevel, status, incidentCount,
              earliestReport, latestReport
       FROM v_IncidentStatsByLocation
       ORDER BY incidentCount DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/incidents-by-province  — for bar chart, grouped by province
router.get('/incidents-by-province', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT
         CASE
           WHEN location IN ('Lahore','Multan','Faisalabad','Rawalpindi','Sukkur',
                             'Bahawalpur','Gujranwala','Sialkot','Sargodha','Sukkur',
                             'South Punjab','Lahore Cantonment','Lahore, Punjab')
                THEN 'Punjab'
           WHEN location IN ('Karachi','Hyderabad','Sukkur','Larkana','Mirpurkhas',
                             'Korangi, Karachi','Karachi Coast','Sindh Coast',
                             'Thatta','Badin','Nawabshah','Karachi, Sindh')
                THEN 'Sindh'
           WHEN location IN ('Peshawar','Abbottabad','Swat','Mardan','Mingora',
                             'Mansehra','Dir','Chitral','KPK','Khyber')
                THEN 'KPK'
           WHEN location IN ('Quetta','Gwadar','Turbat','Khuzdar','Balochistan',
                             'Hub','Zhob','Sibi')
                THEN 'Balochistan'
           WHEN location IN ('Islamabad','G-8, Islamabad','G8 Islamabad',
                             'G-9 Islamabad','Trail 3, Margalla Hills',
                             'Margalla Hills','Islamabad, ICT','Blue Area',
                             'Sector F-6','I-9 Industrial Area, Islamabad')
                THEN 'Islamabad (ICT)'
           WHEN location IN ('Gilgit','Skardu','Hunza','Ghanche',
                             'Gilgit-Baltistan','Gilgit Baltistan')
                THEN 'Gilgit-Baltistan'
           WHEN location IN ('Muzaffarabad','Mirpur','Rawalakot','AJK',
                             'Azad Kashmir')
                THEN 'AJK'
           WHEN location IN ('Murree','Murree Hills')
                THEN 'Punjab'
           ELSE 'Other'
         END AS location,
         COUNT(*)                                                   AS total,
         SUM(CASE WHEN severityLevel = 'Critical' THEN 1 ELSE 0 END) AS critical,
         SUM(CASE WHEN severityLevel = 'High'     THEN 1 ELSE 0 END) AS high
       FROM Emergency_Report
       GROUP BY
         CASE
           WHEN location IN ('Lahore','Multan','Faisalabad','Rawalpindi','Sukkur',
                             'Bahawalpur','Gujranwala','Sialkot','Sargodha','Sukkur',
                             'South Punjab','Lahore Cantonment','Lahore, Punjab')
                THEN 'Punjab'
           WHEN location IN ('Karachi','Hyderabad','Sukkur','Larkana','Mirpurkhas',
                             'Korangi, Karachi','Karachi Coast','Sindh Coast',
                             'Thatta','Badin','Nawabshah','Karachi, Sindh')
                THEN 'Sindh'
           WHEN location IN ('Peshawar','Abbottabad','Swat','Mardan','Mingora',
                             'Mansehra','Dir','Chitral','KPK','Khyber')
                THEN 'KPK'
           WHEN location IN ('Quetta','Gwadar','Turbat','Khuzdar','Balochistan',
                             'Hub','Zhob','Sibi')
                THEN 'Balochistan'
           WHEN location IN ('Islamabad','G-8, Islamabad','G8 Islamabad',
                             'G-9 Islamabad','Trail 3, Margalla Hills',
                             'Margalla Hills','Islamabad, ICT','Blue Area',
                             'Sector F-6','I-9 Industrial Area, Islamabad')
                THEN 'Islamabad (ICT)'
           WHEN location IN ('Gilgit','Skardu','Hunza','Ghanche',
                             'Gilgit-Baltistan','Gilgit Baltistan')
                THEN 'Gilgit-Baltistan'
           WHEN location IN ('Muzaffarabad','Mirpur','Rawalakot','AJK',
                             'Azad Kashmir')
                THEN 'AJK'
           WHEN location IN ('Murree','Murree Hills')
                THEN 'Punjab'
           ELSE 'Other'
         END
       ORDER BY total DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/finance  — uses v_FinancialSummary
router.get('/finance', auth, rbac('Admin', 'Finance Officer'), async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM v_FinancialSummary ORDER BY eventID`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/resources  — resource utilization
router.get('/resources', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT r.resourceType,
         SUM(wi.quantityAvailable) AS available,
         SUM(wi.quantityAvailable) + ISNULL(SUM(dispatched.qty), 0) AS total
       FROM Warehouse_Inventory wi
       JOIN Resource r ON wi.resourceID = r.resourceID
       LEFT JOIN (
           SELECT wi2.resourceID, SUM(ra.quantityDispatched) AS qty
           FROM Resource_Allocation ra
           JOIN Warehouse_Inventory wi2 ON ra.inventoryID = wi2.inventoryID
           WHERE ra.status IN ('Dispatched','Consumed')
           GROUP BY wi2.resourceID
       ) dispatched ON r.resourceID = dispatched.resourceID
       GROUP BY r.resourceType
       ORDER BY r.resourceType`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/response-times  — avg response time by week
router.get('/response-times', auth, async (req, res) => {
    try {
        const rows = await query(
            `SELECT
         'Week ' + CAST(DATEPART(WEEK, er.timeOfReport) AS VARCHAR) AS week,
         AVG(DATEDIFF(MINUTE, er.timeOfReport, ta.assignedAt)) AS avgMinutes
       FROM Emergency_Report er
       JOIN Team_Assignment ta ON er.reportID = ta.reportID
       WHERE ta.assignedAt IS NOT NULL
       GROUP BY DATEPART(WEEK, er.timeOfReport)
       ORDER BY DATEPART(WEEK, er.timeOfReport)`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/audit  — uses v_AuditTrail view
router.get('/audit', auth, rbac('Admin'), async (req, res) => {
    try {
        const { userID, action, entity, from, to } = req.query;
        let where = 'WHERE 1=1';
        const params = {};
        if (userID) { where += ' AND al.userID = @uid';         params.uid    = { type: sql.Int,         val: parseInt(userID) }; }
        if (action) { where += ' AND al.actionType = @action';  params.action = { type: sql.VarChar(20), val: action }; }
        if (entity) { where += ' AND al.tableAffected = @ent';  params.ent    = { type: sql.VarChar(50), val: entity }; }
        if (from)   { where += ' AND al.timestamp >= @from';    params.from   = { type: sql.DateTime,    val: new Date(from) }; }
        if (to)     { where += ' AND al.timestamp <= @to';      params.to     = { type: sql.DateTime,    val: new Date(to) }; }

        const rows = await query(
            `SELECT TOP 200 al.logID, al.timestamp, al.actionType, al.tableAffected,
              al.recordID, al.oldValue, al.newValue,
              u.name AS userName, r.roleName
       FROM Audit_Log al
       LEFT JOIN [User] u  ON al.userID  = u.userID
       LEFT JOIN Role   r  ON u.roleID   = r.roleID
       ${where}
       ORDER BY al.timestamp DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;