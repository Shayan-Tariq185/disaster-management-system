
use DB_Project

-- -----------------------------------------------------------
-- demo 1: successful resource allocation request transaction
-- shows : begin tran -> create pending allocation request
--         -> create approval request -> commit
-- note  : inventory is not deducted here because the request
--         is still pending. stock changes later when the
--         allocation is approved/dispatched.
-- -----------------------------------------------------------
print 'demo 1: successful resource allocation request';

declare @inventoryID int;
declare @reportID int;
declare @allocatedBy int;
declare @newAllocID int;

select top 1 @inventoryID = wi.inventoryID
from Warehouse_Inventory wi
where wi.quantityAvailable > 0
order by wi.inventoryID;

select top 1 @reportID = er.reportID
from Emergency_Report er
where er.status in ('Pending', 'Verified', 'Assigned')
order by er.reportID;

select top 1 @allocatedBy = u.userID
from [User] u
order by u.userID;

begin try
    begin transaction;

        exec sp_AllocateResource
            @inventoryID = @inventoryID,
            @reportID = @reportID,
            @allocatedBy = @allocatedBy,
            @quantity = 25,
            @notes = 'demo allocation request',
            @newAllocID = @newAllocID output;

    commit transaction;
    print 'demo 1 committed — allocationID: ' + cast(@newAllocID as varchar(20));
end try
begin catch
    if @@trancount > 0 rollback transaction;
    print 'demo 1 rolled back: ' + error_message();
end catch;

select allocationID, inventoryID, reportID, allocatedBy, quantityRequested, quantityDispatched, status
from Resource_Allocation
where allocationID = (select max(allocationID) from Resource_Allocation);

select requestID, requestType, referenceType, referenceID, status
from Approval_Request
where referenceType = 'Resource_Allocation'
  and referenceID = (select max(allocationID) from Resource_Allocation);

-- -----------------------------------------------------------
-- demo 2: rollback — insufficient stock on dispatch update
-- shows : approved/dispatched quantity tries to exceed stock,
--         trigger blocks it and transaction rolls back.
-- -----------------------------------------------------------
print 'demo 2: rollback — insufficient stock on dispatch';

declare @targetAllocID int;
declare @targetInventoryID int;
declare @stockBefore decimal(10,2);

select top 1
    @targetAllocID = ra.allocationID,
    @targetInventoryID = ra.inventoryID
from Resource_Allocation ra
order by ra.allocationID desc;

select @stockBefore = quantityAvailable
from Warehouse_Inventory
where inventoryID = @targetInventoryID;

print 'stock before failed dispatch: ' + cast(@stockBefore as varchar(30));

begin try
    begin transaction;

        update Resource_Allocation
        set quantityDispatched = @stockBefore + 9999,
            status = 'Dispatched'
        where allocationID = @targetAllocID;

    commit transaction;
    print 'demo 2 committed (should not reach here)';
end try
begin catch
    if @@trancount > 0 rollback transaction;
    print 'demo 2 rolled back (expected): ' + error_message();
end catch;

select inventoryID, quantityAvailable
from Warehouse_Inventory
where inventoryID = @targetInventoryID;

select allocationID, quantityRequested, quantityDispatched, status
from Resource_Allocation
where allocationID = @targetAllocID;

-- -----------------------------------------------------------
-- demo 3: patient admission with auto bed update
-- shows : sp_AdmitPatient -> insert patient -> trigger
--         decrements available beds.
-- -----------------------------------------------------------
print 'demo 3: patient admission transaction';

declare @admitReportID int;
declare @hospitalID int;
declare @bedsBefore int;
declare @bedsAfter int;
declare @newPID int;

select top 1 @admitReportID = er.reportID
from Emergency_Report er
order by er.reportID;

select top 1 @hospitalID = h.hospitalID
from Hospital h
where h.availableBeds > 0
order by h.hospitalID;

select @bedsBefore = availableBeds
from Hospital
where hospitalID = @hospitalID;

print 'beds before admission: ' + cast(@bedsBefore as varchar(20));

begin try
    exec sp_AdmitPatient
        @reportID = @admitReportID,
        @hospitalID = @hospitalID,
        @patientName = 'tariq ali',
        @caseSeverity = 'Stable',
        @newPatientID = @newPID output;

    select @bedsAfter = availableBeds
    from Hospital
    where hospitalID = @hospitalID;

    print 'beds after admission:  ' + cast(@bedsAfter as varchar(20));
    print 'patientID created:     ' + cast(@newPID as varchar(20));
end try
begin catch
    print 'demo 3 failed: ' + error_message();
end catch;

-- -----------------------------------------------------------
-- demo 4: rollback — team not available
-- shows : sp_AssignRescueTeam refuses assignment when a team
--         is already assigned/busy.
-- -----------------------------------------------------------
print 'demo 4: rollback — team not available';

declare @busyTeamID int;
declare @assignReportID int;
declare @assignByID int;
declare @outID int;

select top 1 @busyTeamID = teamID
from Rescue_Team
where availabilityStatus <> 'Available'
order by teamID;

select top 1 @assignReportID = er.reportID
from Emergency_Report er
where er.status in ('Pending', 'Verified', 'Assigned')
order by er.reportID desc;

select top 1 @assignByID = u.userID
from [User] u
order by u.userID;

if @busyTeamID is not null
begin
    begin try
        exec sp_AssignRescueTeam
            @teamID = @busyTeamID,
            @reportID = @assignReportID,
            @assignedByID = @assignByID,
            @notes = 'should fail because team is not available',
            @newAssignID = @outID output;

        print 'demo 4 committed (should not reach here)';
    end try
    begin catch
        print 'demo 4 rolled back (expected): ' + error_message();
    end catch;
end
else
begin
    print 'demo 4 skipped: no non-available team exists in current data.';
end;

-- -----------------------------------------------------------
-- demo 5: full approval workflow transaction
-- shows : pending approval -> approved -> downstream status
--         update on related record.
-- note  : for a resource allocation, approval changes the
--         allocation status to Approved. actual stock movement
--         can happen later when dispatch quantity is updated.
-- -----------------------------------------------------------
print 'demo 5: approval workflow transaction';

declare @approvalID int;
declare @approvalRefType varchar(50);
declare @approvalRefID int;

select top 1
    @approvalID = ar.requestID,
    @approvalRefType = ar.referenceType,
    @approvalRefID = ar.referenceID
from Approval_Request ar
where ar.status = 'Pending'
order by ar.requestID;

if @approvalID is not null
begin
    select requestID, status, referenceType, referenceID
    from Approval_Request
    where requestID = @approvalID;

    begin try
        exec sp_ProcessApproval
            @requestID = @approvalID,
            @approverID = 1,
            @decision = 'Approved',
            @comments = 'approved after verification';

        select requestID, status, decisionDate
        from Approval_Request
        where requestID = @approvalID;

        if @approvalRefType = 'Resource_Allocation'
        begin
            select allocationID, status, quantityRequested, quantityDispatched
            from Resource_Allocation
            where allocationID = @approvalRefID;
        end;

        if @approvalRefType = 'Team_Assignment'
        begin
            select assignmentID, status
            from Team_Assignment
            where assignmentID = @approvalRefID;
        end;

        if @approvalRefType = 'Expense'
        begin
            select expenseID, approvalStatus
            from Expense
            where expenseID = @approvalRefID;
        end;
    end try
    begin catch
        print 'demo 5 failed: ' + error_message();
    end catch;
end
else
begin
    print 'demo 5 skipped: no pending approval exists in current data.';
end;

-- -----------------------------------------------------------
-- demo 6: rollback — hospital full
-- shows : sp_AdmitPatient refuses admission when no beds are
--         available.
-- -----------------------------------------------------------
print 'demo 6: rollback — hospital full';
go

declare @fullHospitalID int;
declare @fullReportID int;
declare @oldBeds int;
declare @pid int;

select top 1 @fullHospitalID = hospitalID
from Hospital
order by hospitalID;

select @oldBeds = availableBeds
from Hospital
where hospitalID = @fullHospitalID;

select top 1 @fullReportID = reportID
from Emergency_Report
order by reportID;

begin try
    update Hospital
    set availableBeds = 0
    where hospitalID = @fullHospitalID;

    exec sp_AdmitPatient
        @reportID = @fullReportID,
        @hospitalID = @fullHospitalID,
        @patientName = 'test patient',
        @caseSeverity = 'Critical',
        @newPatientID = @pid output;

    print 'demo 6 committed (should not reach here)';
end try
begin catch
    print 'demo 6 rolled back / blocked (expected): ' + error_message();
end catch;

update Hospital
set availableBeds = @oldBeds
where hospitalID = @fullHospitalID;