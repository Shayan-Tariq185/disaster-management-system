USE DB_Project;
GO

-- ============================================================
-- This script adds enough data so the Admin Dashboard shows:
--   - 6 stat cards with real numbers
--   - Disaster Types doughnut chart
--   - Average Response Time line chart
--   - Resource Status bar chart
--   - Recent Activity feed
-- ============================================================

-- 1. More Citizens (needed for emergency reports)
IF (SELECT COUNT(*) FROM Citizen) < 5
BEGIN
    INSERT INTO Citizen (name, phone, address) VALUES
    ('Ahmed Shah',    '03211234567', 'Lahore'),
    ('Nadia Hussain', '03331234567', 'Karachi'),
    ('Farhan Malik',  '03451234567', 'Peshawar');
END;
GO

-- 2. More Emergency Reports (feeds the Disaster Types chart + stat cards)
-- Only insert if we have fewer than 8 reports
IF (SELECT COUNT(*) FROM Emergency_Report) < 8
BEGIN
    INSERT INTO Emergency_Report 
        (citizenID, eventID, operatorID, location, disasterType, severityLevel, status) 
    VALUES
    (1, 1, 2, 'Lahore',             'Flood',      'Critical', 'Pending'),
    (2, 3, 2, 'Peshawar',           'Flood',      'High',     'Verified'),
    (1, 4, 2, 'Karachi Coast',      'Flood',      'Critical', 'Assigned'),
    (2, 5, 2, 'Korangi, Karachi',   'Fire',       'Medium',   'Resolved'),
    (1, 6, 2, 'Gilgit',             'Earthquake', 'Medium',   'Pending'),
    (2, 7, 2, 'Murree Hills',       'Landslide',  'High',     'Verified'),
    (1, 2, 2, 'Margalla Hills',     'Fire',       'Low',      'Pending'),
    (2, 1, 2, 'Hyderabad',          'Flood',      'High',     'Assigned');
    -- NOTE: tr_AfterInsertEmergencyReport trigger will auto-log each to Audit_Log
END;
GO

-- 3. More Rescue Teams (feeds the Active Teams stat card)
IF (SELECT COUNT(*) FROM Rescue_Team) < 5
BEGIN
    INSERT INTO Rescue_Team (teamName, teamType, currentLocation, availabilityStatus, capacity) VALUES
    ('Charlie Unit', 'Rescue',  'G-9 Islamabad',     'Available', 12),
    ('Delta Unit',   'Medical', 'Rawalpindi',         'Available', 8),
    ('Echo Unit',    'Fire',    'Lahore Cantonment',  'Available', 20);
END;
GO

-- 4. More Team Assignments with different dates (feeds the Response Time chart)
-- The Response Time chart needs assignedAt timestamps to calculate time differences
IF (SELECT COUNT(*) FROM Team_Assignment) < 5
BEGIN
    INSERT INTO Team_Assignment (teamID, reportID, assignedBy, assignedAt, completedAt, status) VALUES
    (3, 3, 3, '2026-04-16 10:30:00', '2026-04-16 18:00:00', 'Completed'),
    (4, 4, 3, '2026-04-19 08:00:00', '2026-04-19 14:00:00', 'Completed'),
    (5, 5, 3, '2026-04-22 09:15:00', NULL,                   'Assigned');
    -- NOTE: tr_AfterInsertTeamAssignment trigger will change team status and log to Audit_Log
END;
GO

-- 5. More Warehouse Inventory (some below threshold for Low Stock alerts)
IF (SELECT COUNT(*) FROM Warehouse_Inventory) < 6
BEGIN
    INSERT INTO Resource (resourceName, resourceType, unitOfMeasure, description) VALUES
    ('Blankets',    'Shelter', 'Unit',  'Emergency thermal blankets'),
    ('Painkillers', 'Medicine','Box',   'Basic painkiller boxes');

    INSERT INTO Warehouse_Inventory (warehouseID, resourceID, quantityAvailable, thresholdLevel) VALUES
    (1, 5, 30,   50),   -- Blankets: 30 available but threshold is 50 → LOW STOCK!
    (2, 6, 0,    20);   -- Painkillers: 0 available → OUT OF STOCK!
END;
GO

-- 6. More Donations (feeds Financial Summary + donations stat card)
IF (SELECT COUNT(*) FROM Donation) < 5
BEGIN
    INSERT INTO Donation (eventID, receivedBy, donorName, donorType, amount, donationDate, paymentMethod) VALUES
    (3, 5, 'UNICEF Pakistan',       'International', 2000000.00, DATEADD(DAY, -10, GETDATE()), 'Wire Transfer'),
    (4, 5, 'Edhi Foundation',       'NGO',            750000.00, DATEADD(DAY, -5, GETDATE()),  'Bank Transfer'),
    (1, 5, 'Ali Khan (Individual)', 'Individual',      25000.00, DATEADD(DAY, -3, GETDATE()),  'Online');
    -- NOTE: tr_AfterInsertDonation_CreateTransaction fires → auto-creates Financial_Transaction rows
END;
GO

-- 7. More Expenses
IF (SELECT COUNT(*) FROM Expense) < 5
BEGIN
    INSERT INTO Expense (eventID, recordedBy, description, category, amount, expenseDate, approvalStatus) VALUES
    (3, 5, 'Emergency shelter setup',    'Logistics',   250000.00, DATEADD(DAY, -9, GETDATE()), 'Approved'),
    (4, 5, 'Evacuation transport',       'Transport',   180000.00, DATEADD(DAY, -4, GETDATE()), 'Pending'),
    (1, 5, 'Food distribution Sukkur',   'Food',         95000.00, DATEADD(DAY, -8, GETDATE()), 'Approved');
    -- NOTE: tr_AfterInsertExpense_CreateTransaction fires → auto-creates Financial_Transaction rows
END;
GO

-- 8. More Approval Requests (feeds Pending Approvals stat card)
IF (SELECT COUNT(*) FROM Approval_Request WHERE status = 'Pending') < 2
BEGIN
    INSERT INTO Approval_Request (requestedBy, approvedBy, requestType, referenceType, referenceID, status, requestDate, comments) VALUES
    (4, NULL, 'Resource Dispatch',  'Resource_Allocation', 1, 'Pending', DATEADD(DAY, -2, GETDATE()), 'Urgent water supply needed'),
    (3, NULL, 'Team Deployment',    'Team_Assignment',     2, 'Pending', DATEADD(DAY, -1, GETDATE()), 'Rescue team for Karachi');
END;
GO

-- 9. Add some more audit entries so Recent Activity shows up
INSERT INTO Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue) VALUES
(1, 'LOGIN',  'User',              1,    NULL,           'Admin logged in'),
(2, 'INSERT', 'Emergency_Report',  5,    NULL,           'New flood report from Lahore'),
(3, 'UPDATE', 'Rescue_Team',       3,    'Available',    'Assigned'),
(4, 'UPDATE', 'Warehouse_Inventory', 1,  '5000',         '4750'),
(5, 'INSERT', 'Donation',          3,    NULL,           'UNICEF donation of Rs 2,000,000'),
(1, 'APPROVE','Approval_Request',  1,    'Pending',      'Approved');
GO

-- ============================================================
-- VERIFY: Run this to confirm data is populated
-- ============================================================
PRINT '=== Data Counts ===';
SELECT 'Citizens'             AS Entity, COUNT(*) AS Cnt FROM Citizen
UNION ALL SELECT 'Disaster Events',      COUNT(*) FROM Disaster_Event
UNION ALL SELECT 'Emergency Reports',    COUNT(*) FROM Emergency_Report
UNION ALL SELECT 'Rescue Teams',         COUNT(*) FROM Rescue_Team
UNION ALL SELECT 'Team Assignments',     COUNT(*) FROM Team_Assignment
UNION ALL SELECT 'Warehouses',           COUNT(*) FROM Warehouse
UNION ALL SELECT 'Resources',            COUNT(*) FROM Resource
UNION ALL SELECT 'Inventory Items',      COUNT(*) FROM Warehouse_Inventory
UNION ALL SELECT 'Resource Allocations', COUNT(*) FROM Resource_Allocation
UNION ALL SELECT 'Hospitals',            COUNT(*) FROM Hospital
UNION ALL SELECT 'Patients',             COUNT(*) FROM Patient
UNION ALL SELECT 'Donations',            COUNT(*) FROM Donation
UNION ALL SELECT 'Expenses',             COUNT(*) FROM Expense
UNION ALL SELECT 'Financial Txns',       COUNT(*) FROM Financial_Transaction
UNION ALL SELECT 'Approval Requests',    COUNT(*) FROM Approval_Request
UNION ALL SELECT 'Audit Logs',           COUNT(*) FROM Audit_Log;

-- Check what the dashboard stats endpoint would return
SELECT
    (SELECT COUNT(*) FROM Emergency_Report WHERE status NOT IN ('Resolved','Closed'))  AS activeIncidents,
    (SELECT COUNT(*) FROM Emergency_Report WHERE severityLevel = 'Critical'
         AND status NOT IN ('Resolved','Closed'))                                       AS criticalIncidents,
    (SELECT COUNT(*) FROM Rescue_Team WHERE availabilityStatus IN ('Assigned','Busy')) AS activeTeams,
    (SELECT COUNT(*) FROM v_ResourceInventorySummary WHERE stockStatus != 'Normal')    AS lowStockAlerts,
    (SELECT COUNT(*) FROM Approval_Request WHERE status = 'Pending')                   AS pendingApprovals,
    (SELECT ISNULL(SUM(amount),0) FROM Donation
          WHERE MONTH(donationDate) = MONTH(GETDATE()))                                AS donationsThisMonth,
    (SELECT COUNT(*) FROM Audit_Log
          WHERE CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE))                     AS auditEventsToday;
