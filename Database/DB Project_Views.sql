use DB_Project
go
-- Views
-- -----------------------------------------------------------
-- view 1: v_ActiveIncidents
-- purpose : operator/admin dashboard — active reports with
--           event and citizen info joined in.
-- -----------------------------------------------------------
create view v_ActiveIncidents as
select
    er.reportID,
    er.location,
    er.disasterType,
    er.severityLevel,
    er.timeOfReport,
    er.status as reportStatus,
    de.eventName,
    de.disasterType as eventType,
    c.name as citizenName,
    c.phone as citizenPhone,
    u.name as operatorName
from Emergency_Report er
    left join Disaster_Event de on er.eventID    = de.eventID
    left join Citizen         c  on er.citizenID = c.citizenID
    left join [User]          u  on er.operatorID = u.userID
where er.status not in ('Pending','Verified', 'Assigned');
go
-- -----------------------------------------------------------
-- view 2: v_ResourceInventorySummary
-- purpose : warehouse manager dashboard — stock levels per
--           resource per warehouse, with low-stock flag.
-- -----------------------------------------------------------
create view v_ResourceInventorySummary as
select
    wi.inventoryID,
    wi.warehouseID,
    wi.resourceID,
    w.name as warehouseName,
    w.location as warehouseLocation,
    r.resourceName,
    r.resourceType,
    r.unitOfMeasure,
    wi.quantityAvailable,
    wi.thresholdLevel,
    wi.lastUpdated,
    case
        when wi.quantityAvailable = 0                    then 'Out of Stock'
        when wi.quantityAvailable < wi.thresholdLevel    then 'Low Stock'
        else 'Normal'
    end as stockStatus
from Warehouse_Inventory wi
    join Warehouse w on wi.warehouseID = w.warehouseID
    join Resource  r on wi.resourceID  = r.resourceID;
go
-- -----------------------------------------------------------
-- view 3: v_RescueTeamStatus
-- purpose : field officer dashboard — teams with current
--           assignment info.
-- -----------------------------------------------------------
create view v_RescueTeamStatus as
select
    rt.teamID,
    rt.teamName,
    rt.teamType,
    rt.currentLocation,
    rt.availabilityStatus,
    rt.capacity,
    ta.assignmentID,
    ta.assignedAt,
    er.location      as assignedToLocation,
    er.severityLevel as incidentSeverity
from Rescue_Team rt
    left join Team_Assignment ta on rt.teamID  = ta.teamID
        and ta.status not in ('Completed','Cancelled')
    left join Emergency_Report er on ta.reportID = er.reportID;
go
-- -----------------------------------------------------------
-- view 4: v_HospitalCapacity
-- purpose : hospital coordination screen — beds with occupancy
--           percentage and load label.
-- -----------------------------------------------------------
create view v_HospitalCapacity as
select
    h.hospitalID,
    h.hospitalName,
    h.location,
    h.totalBeds,
    h.availableBeds,
    (h.totalBeds - h.availableBeds)                          as occupiedBeds,
    cast(
        (cast(h.totalBeds - h.availableBeds as float)
         / nullif(h.totalBeds, 0)) * 100
    as decimal(5,2))                                         as occupancyPct,
    case
        when (cast(h.totalBeds - h.availableBeds as float) / nullif(h.totalBeds,0)) > 0.85 then 'Overloaded'
        when (cast(h.totalBeds - h.availableBeds as float) / nullif(h.totalBeds,0)) > 0.60 then 'High Load'
        else 'Normal'
    end as loadStatus,
    h.contactInfo
from Hospital h;
go
-- -----------------------------------------------------------
-- view 5: v_FinancialSummary
-- purpose : finance officer dashboard — aggregated totals per
--           disaster event.
-- -----------------------------------------------------------
create view v_FinancialSummary as
select
    de.eventID,
    de.eventName,
    de.disasterType,
    de.status        as eventStatus,
    sum(case when ft.transactionType = 'Donation'    then ft.amount else 0 end) as totalDonations,
    sum(case when ft.transactionType = 'Expense'     then ft.amount else 0 end) as totalExpenses,
    sum(case when ft.transactionType = 'Procurement' then ft.amount else 0 end) as totalProcurement,
    sum(case when ft.transactionType = 'Donation'    then ft.amount else 0 end)
    - sum(case when ft.transactionType = 'Expense'   then ft.amount else 0 end)
    - sum(case when ft.transactionType = 'Procurement' then ft.amount else 0 end) as netBalance,
    count(ft.transactionID) as transactionCount
from Disaster_Event de
    left join Financial_Transaction ft on de.eventID = ft.eventID
group by de.eventID, de.eventName, de.disasterType, de.status;
go
-- -----------------------------------------------------------
-- view 6: v_PendingApprovals
-- purpose : approval workflow screen — pending requests with
--           requester name and role.
-- -----------------------------------------------------------
create view v_PendingApprovals as
select
    ar.requestID,
    ar.requestType,
    ar.referenceType,
    ar.referenceID,
    ar.status,
    ar.requestDate,
    ar.comments,
    u.name as requestedByName,
    r.roleName as requestedByRole
from Approval_Request ar
    join [User] u on ar.requestedBy = u.userID
    join Role   r on u.roleID = r.roleID
where ar.status = 'Pending';
go
-- -----------------------------------------------------------
-- view 7: v_AuditTrail
-- purpose : admin audit log screen — human-readable log with
--           user name and role.
-- -----------------------------------------------------------
create view v_AuditTrail as
select
    al.logID,
    al.timestamp,
    u.name           as userName,
    ro.roleName,
    al.actionType,
    al.tableAffected,
    al.recordID,
    al.oldValue,
    al.newValue
from Audit_Log al
    left join [User] u  on al.userID  = u.userID
    left join Role   ro on u.roleID   = ro.roleID;
go
-- -----------------------------------------------------------
-- view 8: v_IncidentStatsByProvince
-- purpose : MIS reporting chart — incident count grouped by
--           status and type.
-- -----------------------------------------------------------
create view v_IncidentStatsByLocation as
select
    location,
    disasterType,
    severityLevel,
    status,
    count(*) as incidentCount,
    min(timeOfReport) as earliestReport,
    max(timeOfReport) as latestReport
from Emergency_Report
group by location, disasterType, severityLevel, status;
go
-- -----------------------------------------------------------
-- view 9: v_AllocationStatus
-- purpose : shows resource request pipeline with names
--           instead of raw IDs.
-- -----------------------------------------------------------
create view v_AllocationStatus as
select
    ra.allocationID,
    r.resourceName,
    r.resourceType,
    w.name           as warehouseName,
    er.location      as incidentLocation,
    er.severityLevel as incidentSeverity,
    ra.quantityRequested,
    ra.quantityDispatched,
    ra.quantityConsumed,
    ra.status        as allocationStatus,
    ra.allocationDate,
    u.name           as allocatedByName
from Resource_Allocation ra
    join Warehouse_Inventory wi on ra.inventoryID  = wi.inventoryID
    join Resource            r  on wi.resourceID   = r.resourceID
    join Warehouse           w  on wi.warehouseID  = w.warehouseID
    join Emergency_Report    er on ra.reportID     = er.reportID
    join [User]              u  on ra.allocatedBy  = u.userID;
    go