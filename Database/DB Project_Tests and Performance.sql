use DB_Project


set statistics time on;
set statistics io on;

-- -------------------------------------------------------
-- test a: emergency report location filter
-- purpose: demonstrate single-column index benefit on
--          Emergency_Report(location).
-- note   : use an index-friendly predicate, not '%text%'.
-- -------------------------------------------------------
print '--- test a1: emergency report location filter ---';
select *
from Emergency_Report
where location like 's%';

-- -------------------------------------------------------
-- test b: financial transaction date range
-- purpose: demonstrate index benefit on transactionDate.
-- -------------------------------------------------------
print '--- test b1: financial transaction date range ---';
select *
from Financial_Transaction
where transactionDate between '2026-01-01' and '2026-12-31';

-- -------------------------------------------------------
-- test c: direct query vs view
-- purpose: compare direct table query with reusable view
--          abstraction for hospital capacity reporting.
-- -------------------------------------------------------
print '--- test c1: direct hospital capacity query ---';
select
    h.hospitalID,
    h.hospitalName,
    h.location,
    h.totalBeds,
    h.availableBeds,
    (h.totalBeds - h.availableBeds) as occupiedBeds,
    cast(
        (cast(h.totalBeds - h.availableBeds as float)
         / nullif(h.totalBeds, 0)) * 100
    as decimal(5,2)) as occupancyPct
from Hospital h;

print '--- test c2: via view v_HospitalCapacity ---';
select *
from v_HospitalCapacity;

-- -------------------------------------------------------
-- test d: composite index on (disasterType, severityLevel)
-- purpose: demonstrate a multi-column filter.
-- -------------------------------------------------------
print '--- test d1: composite index query ---';
select reportID, location, timeOfReport
from Emergency_Report
where disasterType = 'Flood'
  and severityLevel = 'High';

-- -------------------------------------------------------
-- test e: resource type filter
-- purpose: demonstrate index benefit on Resource(resourceType)
--          if you created IX_Resource_ResourceType.
-- -------------------------------------------------------
print '--- test e1: resource type filter ---';
select *
from Resource
where resourceType = 'Medicine';

set statistics time off;
set statistics io off;

-- ============================================================
-- section 10: useful queries for viva demo
-- ============================================================

-- active incidents dashboard
select *
from v_ActiveIncidents
order by timeOfReport desc;


-- low stock / resource inventory summary
select *
from v_ResourceInventorySummary
where stockStatus <> 'Normal'
order by warehouseName, resourceName;

-- hospital load balancing
select *
from v_HospitalCapacity
order by occupancyPct desc;

-- finance summary per disaster event
select *
from v_FinancialSummary
order by eventID;

-- pending approvals
select *
from v_PendingApprovals
order by requestDate desc;
go

-- audit trail
select top 20 *
from v_AuditTrail
order by timestamp desc;

-- rescue team availability and current assignment state
select *
from v_RescueTeamStatus
order by teamName;

-- resource allocation pipeline
select *
from v_AllocationStatus
order by allocationDate desc;

-- incident count by disaster type
select
    disasterType,
    count(*) as totalIncidents
from Emergency_Report
group by disasterType
order by totalIncidents desc;

-- incident count by status
select
    status,
    count(*) as totalIncidents
from Emergency_Report
group by status
order by totalIncidents desc;

-- current warehouse stock
select
    wi.inventoryID,
    w.name as warehouseName,
    r.resourceName,
    wi.quantityAvailable,
    wi.thresholdLevel
from Warehouse_Inventory wi
    join Warehouse w on wi.warehouseID = w.warehouseID
    join Resource r on wi.resourceID = r.resourceID
order by wi.inventoryID;