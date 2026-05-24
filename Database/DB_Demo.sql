USE DB_Project;
GO

/* 1) Update view: add warehouseID/resourceID for filtering */
CREATE OR ALTER VIEW v_ResourceInventorySummary AS
SELECT
    wi.inventoryID,
    wi.warehouseID,
    wi.resourceID,
    w.name AS warehouseName,
    w.location AS warehouseLocation,
    r.resourceName,
    r.resourceType,
    r.unitOfMeasure,
    wi.quantityAvailable,
    wi.thresholdLevel,
    wi.lastUpdated,
    CASE
        WHEN wi.quantityAvailable = 0                 THEN 'Out of Stock'
        WHEN wi.quantityAvailable < wi.thresholdLevel THEN 'Low Stock'
        ELSE 'Normal'
    END AS stockStatus
FROM Warehouse_Inventory wi
    JOIN Warehouse w ON wi.warehouseID = w.warehouseID
    JOIN Resource  r ON wi.resourceID  = r.resourceID;
GO

/* 2) Update trigger: Expense -> Financial_Transaction type */
CREATE OR ALTER TRIGGER tr_AfterInsertExpense_CreateTransaction
ON Expense
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Financial_Transaction
        (eventID, recordedBy, transactionType, amount, referenceID, transactionDate)
    SELECT
        i.eventID,
        i.recordedBy,
        CASE WHEN i.category = 'Procurement' THEN 'Procurement' ELSE 'Expense' END,
        i.amount,
        i.expenseID,
        i.expenseDate
    FROM inserted i
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM Financial_Transaction ft
        WHERE ft.referenceID = i.expenseID
          AND ft.transactionType IN ('Expense', 'Procurement')
    );
END;
GO

/* 3) Add missing stored procedures (safe to re-run) */
CREATE OR ALTER PROCEDURE sp_RecordDonation
    @eventID int,
    @receivedBy int,
    @donorName varchar(100) = null,
    @donorType varchar(50) = null,
    @amount decimal(18,2),
    @paymentMethod varchar(50) = null,
    @newDonationID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO Donation (eventID, receivedBy, donorName, donorType, amount, donationDate, paymentMethod)
        VALUES (@eventID, @receivedBy, @donorName, @donorType, @amount, GETDATE(), @paymentMethod);

        SET @newDonationID = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_RecordExpense
    @eventID int,
    @recordedBy int,
    @description varchar(255) = null,
    @category varchar(50) = null,
    @amount decimal(18,2),
    @newExpenseID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO Expense (eventID, recordedBy, description, category, amount, expenseDate, approvalStatus)
        VALUES (@eventID, @recordedBy, @description, @category, @amount, GETDATE(),
                CASE WHEN @amount > 100000 THEN 'Pending' ELSE 'Approved' END);

        SET @newExpenseID = SCOPE_IDENTITY();

        IF @amount > 100000
        BEGIN
            INSERT INTO Approval_Request (requestedBy, requestType, referenceType, referenceID, status, comments)
            VALUES (@recordedBy, 'Expense Approval', 'Expense', @newExpenseID, 'Pending', @description);
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* 4) Add procurement seed data safely (no duplicates) */
IF NOT EXISTS (
    SELECT 1 FROM Expense
    WHERE eventID = 1
      AND recordedBy = 5
      AND description = 'Procurement of water tanks'
      AND amount = 80000.00
)
BEGIN
    INSERT INTO Expense (eventID, recordedBy, description, category, amount, expenseDate, approvalStatus)
    VALUES (1, 5, 'Procurement of water tanks', 'Procurement', 80000.00, '2026-04-18', 'Approved');
END;
GO

DECLARE @procExpenseID int;
SELECT TOP 1 @procExpenseID = expenseID
FROM Expense
WHERE eventID = 1
  AND recordedBy = 5
  AND description = 'Procurement of water tanks'
  AND amount = 80000.00
ORDER BY expenseID DESC;

IF @procExpenseID IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM Financial_Transaction
    WHERE referenceID = @procExpenseID
      AND transactionType = 'Procurement'
)
BEGIN
    INSERT INTO Financial_Transaction (eventID, recordedBy, transactionType, amount, referenceID, transactionDate)
    VALUES (1, 5, 'Procurement', 80000.00, @procExpenseID, '2026-04-18');
END;
GO

USE DB_Project;
GO

CREATE OR ALTER PROCEDURE sp_ProcessApproval
    @requestID int,
    @approverID int,
    @decision varchar(20),
    @comments varchar(200) = null
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Approval_Request
        SET status = @decision,
            approvedBy = @approverID,
            decisionDate = GETDATE(),
            comments = @comments
        WHERE requestID = @requestID;

        DECLARE @refType varchar(50), @refID int;
        SELECT @refType = referenceType, @refID = referenceID
        FROM Approval_Request WHERE requestID = @requestID;

        IF @decision = 'Approved'
        BEGIN
            IF @refType = 'Resource_Allocation'
                UPDATE Resource_Allocation SET status = 'Approved' WHERE allocationID = @refID;
            ELSE IF @refType = 'Team_Assignment'
                UPDATE Team_Assignment SET status = 'Assigned' WHERE assignmentID = @refID;
            ELSE IF @refType = 'Expense'
                UPDATE Expense SET approvalStatus = 'Approved' WHERE expenseID = @refID;
        END
        ELSE IF @decision = 'Rejected'
        BEGIN
            IF @refType = 'Resource_Allocation'
                UPDATE Resource_Allocation SET status = 'Rejected' WHERE allocationID = @refID;
            ELSE IF @refType = 'Team_Assignment'
                UPDATE Team_Assignment SET status = 'Cancelled' WHERE assignmentID = @refID;
            ELSE IF @refType = 'Expense'
                UPDATE Expense SET approvalStatus = 'Rejected' WHERE expenseID = @refID;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AssignRescueTeam
    @teamID int,
    @reportID int,
    @assignedByID int,
    @notes varchar(200) = null,
    @newAssignID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Rescue_Team WHERE teamID = @teamID AND availabilityStatus = 'Available')
    BEGIN
        RAISERROR('Team is not currently available for assignment.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO Team_Assignment (teamID, reportID, assignedBy, status)
        VALUES (@teamID, @reportID, @assignedByID, 'Pending');

        SET @newAssignID = SCOPE_IDENTITY();

        INSERT INTO Approval_Request (requestedBy, requestType, referenceType, referenceID, status, comments)
        VALUES (@assignedByID, 'Team Deployment', 'Team_Assignment', @newAssignID, 'Pending', @notes);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AllocateResource
    @inventoryID int,
    @reportID int,
    @allocatedBy int,
    @quantity decimal(10,2),
    @notes varchar(200) = null,
    @newAllocID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO Resource_Allocation (inventoryID, reportID, allocatedBy, quantityRequested, status)
        VALUES (@inventoryID, @reportID, @allocatedBy, @quantity, 'Pending');

        SET @newAllocID = SCOPE_IDENTITY();

        INSERT INTO Approval_Request (requestedBy, requestType, referenceType, referenceID, status, comments)
        VALUES (@allocatedBy, 'Resource Dispatch', 'Resource_Allocation', @newAllocID, 'Pending', @notes);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AdmitPatient
    @reportID int,
    @hospitalID int,
    @patientName varchar(100),
    @caseSeverity varchar(20),
    @newPatientID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF (SELECT availableBeds FROM Hospital WHERE hospitalID = @hospitalID) <= 0
    BEGIN
        RAISERROR('Hospital has no available beds.', 16, 1);
        RETURN;
    END

    INSERT INTO Patient (reportID, hospitalID, patientName, caseSeverity, status)
    VALUES (@reportID, @hospitalID, @patientName, @caseSeverity, 'Admitted');

    SET @newPatientID = SCOPE_IDENTITY();
END;
GO

USE DB_Project;
GO
CREATE OR ALTER PROCEDURE sp_AssignRescueTeam
    @teamID int,
    @reportID int,
    @assignedByID int,
    @notes varchar(200) = null,
    @newAssignID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Rescue_Team WHERE teamID = @teamID AND availabilityStatus = 'Available')
    BEGIN
        RAISERROR('Team is not currently available for assignment.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO Team_Assignment (teamID, reportID, assignedBy, status)
        VALUES (@teamID, @reportID, @assignedByID, 'Assigned');

        SET @newAssignID = SCOPE_IDENTITY();

        INSERT INTO Approval_Request (requestedBy, requestType, referenceType, referenceID, status, comments)
        VALUES (@assignedByID, 'Team Deployment', 'Team_Assignment', @newAssignID, 'Pending', @notes);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO