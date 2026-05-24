use DB_Project
go

-- -----------------------------------------------------------
-- trigger 1: tr_AfterInsertEmergencyReport
-- fires  : after insert on Emergency_Report
-- action : logs each new report into Audit_Log
-- -----------------------------------------------------------
create trigger tr_AfterInsertEmergencyReport
on Emergency_Report
after insert
as
begin
    set nocount on;

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        i.operatorID,
        'INSERT',
        'Emergency_Report',
        i.reportID,
        null,
        concat(
            'location=', isnull(i.location, 'n/a'),
            '; disasterType=', isnull(i.disasterType, 'n/a'),
            '; severity=', isnull(i.severityLevel, 'n/a'),
            '; status=', isnull(i.status, 'n/a')
        )
    from inserted i;
end;
go
-- -----------------------------------------------------------
-- trigger 2: tr_AfterInsertTeamAssignment
-- fires  : after insert on Team_Assignment
-- action : updates Rescue_Team.availabilityStatus to 'Assigned'
--          only when the team was actually available/completed,
--          then logs the change.
-- -----------------------------------------------------------
create trigger tr_AfterInsertTeamAssignment
on Team_Assignment
after insert
as
begin
    set nocount on;

    declare @teamChanges table
    (
        userID int,
        teamID int,
        oldStatus varchar(20),
        newStatus varchar(20)
    );

    update rt
    set availabilityStatus = 'Assigned'
    output
        i.assignedBy,
        inserted.teamID,
        deleted.availabilityStatus,
        inserted.availabilityStatus
    into @teamChanges (userID, teamID, oldStatus, newStatus)
    from Rescue_Team rt
        join inserted i on rt.teamID = i.teamID
    where rt.availabilityStatus in ('Available', 'Completed');

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        tc.userID,
        'UPDATE',
        'Rescue_Team',
        tc.teamID,  
        tc.oldStatus,
        tc.newStatus
    from @teamChanges tc;
end;
go
-- -----------------------------------------------------------
-- trigger 3: tr_AfterUpdateTeamAssignmentCompleted
-- fires  : after update on Team_Assignment
-- action : when an assignment changes to 'Completed' or
--          'Cancelled', the team is set back to 'Available'
--          only if it has no other active assignments.
-- -----------------------------------------------------------
create trigger tr_AfterUpdateTeamAssignmentCompleted
on Team_Assignment
after update
as
begin
    set nocount on;

    declare @teamChanges table
    (
        userID int,
        teamID int,
        oldStatus varchar(20),
        newStatus varchar(20)
    );

    ;with finishedTeams as
    (
        select distinct
            i.teamID,
            i.assignedBy
        from inserted i
            join deleted d on i.assignmentID = d.assignmentID
        where i.status in ('Completed', 'Cancelled')
          and isnull(d.status, '') <> i.status
    )
    update rt
    set availabilityStatus = 'Available'
    output
        ft.assignedBy,
        inserted.teamID,
        deleted.availabilityStatus,
        inserted.availabilityStatus
    into @teamChanges (userID, teamID, oldStatus, newStatus)
    from Rescue_Team rt
        join finishedTeams ft on rt.teamID = ft.teamID
    where not exists
    (
        select 1
        from Team_Assignment ta
        where ta.teamID = rt.teamID
          and ta.status not in ('Completed', 'Cancelled')
    )
      and rt.availabilityStatus <> 'Available';

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        tc.userID,
        'UPDATE',
        'Rescue_Team',
        tc.teamID,
        tc.oldStatus,
        tc.newStatus
    from @teamChanges tc;
end;
go
-- -----------------------------------------------------------
-- trigger 4: tr_ManageResourceAllocationInventory
-- -----------------------------------------------------------
create trigger tr_ManageResourceAllocationInventory
on Resource_Allocation
after insert, update
as
begin
    set nocount on;

    declare @netChanges table
    (
        inventoryID int,
        qtyDelta decimal(10,2)
    );

    ;with stockMoves as
    (
        select
            i.inventoryID,
            sum(
                case
                    when i.status in ('Dispatched', 'Consumed') then isnull(i.quantityDispatched, 0)
                    when i.status = 'Approved' and isnull(i.quantityDispatched, 0) > 0 then i.quantityDispatched
                    else 0
                end
            ) as qtyChange
        from inserted i
        group by i.inventoryID

        union all

        select
            d.inventoryID,
            -sum(
                case
                    when d.status in ('Dispatched', 'Consumed') then isnull(d.quantityDispatched, 0)
                    when d.status = 'Approved' and isnull(d.quantityDispatched, 0) > 0 then d.quantityDispatched
                    else 0
                end
            ) as qtyChange
        from deleted d
        group by d.inventoryID
    )
    insert into @netChanges (inventoryID, qtyDelta)
    select
        inventoryID,
        sum(qtyChange) as qtyDelta
    from stockMoves
    group by inventoryID;

    if exists
    (
        select 1
        from @netChanges nc
            join Warehouse_Inventory wi on nc.inventoryID = wi.inventoryID
        where nc.qtyDelta > 0
          and wi.quantityAvailable < nc.qtyDelta
    )
    begin
        raiserror('resource allocation failed: insufficient stock in warehouse inventory.', 16, 1);
        rollback transaction;
        return;
    end;

    update wi
    set
        quantityAvailable = wi.quantityAvailable - nc.qtyDelta,
        lastUpdated = getdate()
    from Warehouse_Inventory wi
        join @netChanges nc on wi.inventoryID = nc.inventoryID
    where nc.qtyDelta <> 0;

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        i.allocatedBy,
        case when d.allocationID is null then 'INSERT' else 'UPDATE' end,
        'Resource_Allocation',
        i.allocationID,
        case
            when d.allocationID is null then null
            else concat(
                    'status=', isnull(d.status, 'n/a'),
                    '; dispatched=', cast(isnull(d.quantityDispatched, 0) as varchar(30))
                 )
        end,
        concat(
            'status=', isnull(i.status, 'n/a'),
            '; requested=', cast(isnull(i.quantityRequested, 0) as varchar(30)),
            '; dispatched=', cast(isnull(i.quantityDispatched, 0) as varchar(30))
        )
    from inserted i
        left join deleted d on i.allocationID = d.allocationID;
end;
go
-- -----------------------------------------------------------
-- trigger 5: tr_LowStockAlert
-- fires  : after update on Warehouse_Inventory
-- action : when stock crosses from normal to below threshold,
--          writes a warning-style audit entry.
-- -----------------------------------------------------------
create trigger tr_LowStockAlert
on Warehouse_Inventory
after update
as
begin
    set nocount on;

    if update(quantityAvailable)
    begin
        insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
        select
            null,
            'WARNING',
            'Warehouse_Inventory',
            i.inventoryID,
            cast(d.quantityAvailable as varchar(30)),
            cast(i.quantityAvailable as varchar(30))
        from inserted i
            join deleted d on i.inventoryID = d.inventoryID
        where i.quantityAvailable < i.thresholdLevel
          and d.quantityAvailable >= d.thresholdLevel;
    end;
end;
go
-- -----------------------------------------------------------
-- trigger 6: tr_AfterInsertDonation_CreateTransaction
-- fires  : after insert on Donation
-- action : automatically creates a matching
--          Financial_Transaction row.
-- -----------------------------------------------------------
create trigger tr_AfterInsertDonation_CreateTransaction
on Donation
after insert
as
begin
    set nocount on;

    insert into Financial_Transaction
        (eventID, recordedBy, transactionType, amount, referenceID, transactionDate)
    select
        i.eventID,
        i.receivedBy,
        'Donation',
        i.amount,
        i.donationID,
        i.donationDate
    from inserted i
    where not exists
    (
        select 1
        from Financial_Transaction ft
        where ft.transactionType = 'Donation'
          and ft.referenceID = i.donationID
    );
end;
go
-- -----------------------------------------------------------
-- trigger 7: tr_AfterInsertExpense_CreateTransaction
-- fires  : after insert on Expense
-- action : automatically creates a matching
--          Financial_Transaction row.
-- -----------------------------------------------------------
create trigger tr_AfterInsertExpense_CreateTransaction
on Expense
after insert
as
begin
    set nocount on;

    insert into Financial_Transaction
        (eventID, recordedBy, transactionType, amount, referenceID, transactionDate)
    select
        i.eventID,
        i.recordedBy,
        case when i.category = 'Procurement' then 'Procurement' else 'Expense' end,
        i.amount,
        i.expenseID,
        i.expenseDate
    from inserted i
    where not exists
    (
        select 1
        from Financial_Transaction ft
        where ft.transactionType = 'Expense'
          and ft.referenceID = i.expenseID
    );
end;
go

-- -----------------------------------------------------------
-- trigger 9: tr_AfterUpdatePatient_ReleaseBed
-- fires  : after update on Patient
-- action : increments Hospital.availableBeds only when a
--          patient transitions from an occupying state to a
--          released state.
-- -----------------------------------------------------------
create trigger tr_AfterUpdatePatient_ReleaseBed
on Patient
after update
as
begin
    set nocount on;

    ;with releasedBeds as
    (
        select
            i.hospitalID,
            count(*) as bedsToRelease
        from inserted i
            join deleted d on i.patientID = d.patientID
        where d.status in ('Admitted', 'Under Treatment')
          and i.status in ('Discharged', 'Transferred', 'Deceased')
          and d.status <> i.status
        group by i.hospitalID
    )
    update h
    set availableBeds = h.availableBeds + rb.bedsToRelease
    from Hospital h
        join releasedBeds rb on h.hospitalID = rb.hospitalID;

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        null,
        'UPDATE',
        'Patient',
        i.patientID,
        d.status,
        i.status
    from inserted i
        join deleted d on i.patientID = d.patientID
    where d.status in ('Admitted', 'Under Treatment')
      and i.status in ('Discharged', 'Transferred', 'Deceased')
      and d.status <> i.status;
end;
go
-- -----------------------------------------------------------
-- trigger 10: tr_AfterApprovalDecision
-- fires  : after update on Approval_Request
-- action : logs approval / rejection decisions into Audit_Log
--          only when the status actually changes.
-- -----------------------------------------------------------
create trigger tr_AfterApprovalDecision
on Approval_Request
after update
as
begin
    set nocount on;

    insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue)
    select
        i.approvedBy,
        case
            when i.status = 'Approved' then 'APPROVE'
            when i.status = 'Rejected' then 'REJECT'
        end,
        'Approval_Request',
        i.requestID,
        d.status,
        i.status
    from inserted i
        join deleted d on i.requestID = d.requestID
    where i.status in ('Approved', 'Rejected')
      and isnull(d.status, '') <> i.status;
end;
go
