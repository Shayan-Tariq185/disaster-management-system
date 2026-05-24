use DB_Project
go

-- ============================================================
-- 1. sp_ProcessApproval
-- Handles Approving/Rejecting requests and updates related tables
-- ============================================================
CREATE OR ALTER PROCEDURE sp_ProcessApproval
    @requestID int,
    @approverID int,
    @decision varchar(20), -- 'Approved' or 'Rejected'
    @comments varchar(200) = null
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Update the Approval Request
        UPDATE Approval_Request
        SET status = @decision,
            approvedBy = @approverID,
            decisionDate = GETDATE(),
            comments = @comments
        WHERE requestID = @requestID;

        -- 2. Update the Reference Table based on Type
        DECLARE @refType varchar(50), @refID int;
        SELECT @refType = referenceType, @refID = referenceID 
        FROM Approval_Request WHERE requestID = @requestID;

        IF @decision = 'Approved'
        BEGIN
            IF @refType = 'Resource_Allocation'
                UPDATE Resource_Allocation SET status = 'Approved', quantityDispatched = quantityRequested WHERE allocationID = @refID;
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

-- ============================================================
-- 2. sp_AssignRescueTeam
-- Creates an assignment and an approval request
-- ============================================================
CREATE OR ALTER PROCEDURE sp_AssignRescueTeam
    @teamID int,
    @reportID int,
    @assignedByID int,
    @notes varchar(200) = null,
    @newAssignID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if team is available
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

        -- Create Approval Request
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

-- ============================================================
-- 3. sp_AllocateResource
-- Creates an allocation and an approval request
-- ============================================================
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

        -- Create Approval Request
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

-- ============================================================
-- 4. sp_AdmitPatient
-- Admits a patient and checks hospital capacity
-- ============================================================
CREATE OR ALTER PROCEDURE sp_AdmitPatient
    @reportID int,
    @hospitalID int,
    @patientName varchar(100),
    @caseSeverity varchar(20),
    @newPatientID int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check Bed Availability
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

-- ============================================================
-- 5. sp_RecordDonation
-- Inserts a donation and returns its ID
-- ============================================================
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

-- ============================================================
-- 6. sp_RecordExpense
-- Inserts an expense and creates approval if needed
-- ============================================================
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
