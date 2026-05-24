use DB_Project;

-- indexes
create index IX_EmergencyReport_Location    on Emergency_Report(location);
create index IX_EmergencyReport_Severity    on Emergency_Report(severityLevel);
create index IX_EmergencyReport_Status      on Emergency_Report(status);
create index IX_EmergencyReport_TimeOfReport on Emergency_Report(timeOfReport);
 
create index IX_EmergencyReport_Type_Severity on Emergency_Report(disasterType, severityLevel);
 
create index IX_RescueTeam_Status           on Rescue_Team(availabilityStatus);
 
create index IX_WarehouseInventory_Resource  on Warehouse_Inventory(resourceID);
create index IX_WarehouseInventory_Warehouse on Warehouse_Inventory(warehouseID);

create index IX_FinancialTransaction_Date    on Financial_Transaction(transactionDate);
create index IX_FinancialTransaction_Type    on Financial_Transaction(transactionType);
 
create index IX_FinancialTransaction_Event_Type on Financial_Transaction(eventID, transactionType);
 
create index IX_AuditLog_UserID             on Audit_Log(userID);
create index IX_AuditLog_Timestamp          on Audit_Log(timestamp);
create index IX_AuditLog_TableAffected      on Audit_Log(tableAffected);
 
create index IX_ApprovalRequest_Status      on Approval_Request(status);
create index IX_ApprovalRequest_RequestedBy on Approval_Request(requestedBy);

create index IX_Resource_ResourceType on Resource(resourceType);

create index IX_EmergencyReport_EventID on Emergency_Report(eventID);
create index IX_EmergencyReport_OperatorID on Emergency_Report(operatorID);

create index IX_RescueTeam_CurrentLocation on Rescue_Team(currentLocation);

create index IX_TeamAssignment_ReportID on Team_Assignment(reportID);
create index IX_TeamAssignment_TeamID on Team_Assignment(teamID);

create index IX_ResourceAllocation_ReportID on Resource_Allocation(reportID);
create index IX_ResourceAllocation_InventoryID on Resource_Allocation(inventoryID);

create index IX_Patient_ReportID on Patient(reportID);
create index IX_Patient_HospitalID on Patient(hospitalID);

create index IX_Donation_EventID on Donation(eventID);
create index IX_Expense_EventID on Expense(eventID);