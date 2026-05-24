create database DB_Project
use DB_Project 

-- Data Definition Language
create table Role 
( 
 roleID int identity(1,1) primary key, 
 roleName varchar(50) not null check (roleName in ('Admin', 'Operator', 'Field Officer', 'Warehouse Manager', 'Finance Officer')), 
 description varchar(200) 
); 

create table Permission 
( 
 permissionID int identity(1,1) primary key, 
 permissionName varchar(50) not null, 
 resource varchar(50) not null, 
 action varchar(50) not null check (action in ('Create', 'Read','Update', 'Delete')) 
); 

create table Role_Permission 
( 
 roleID int not null check (roleID > 0), 
 permissionID int not null check (permissionID > 0), 
 primary key (roleID, permissionID), 
 foreign key (roleID) references Role(roleID) 
 on update no action on delete cascade, 
 foreign key (permissionID) references Permission(permissionID) 
 on update no action on delete cascade 
); 

create table [User] 
( 
 userID int identity(1,1) primary key, 
 name varchar(100) not null, 
 email varchar(100) unique not null, 
 roleID int check (roleID > 0), 
 isActive bit default 1, 
 passwordHash varchar(200) not null, 
 createdAt datetime default getdate(), 
 foreign key (roleID) references Role(roleID) 
 on update no action on delete set null 
); 

create table Citizen 
( 
 citizenID int identity(1,1) primary key, 
 name varchar(100) not null, 
 phone varchar(20), 
 address varchar(200), 
 registrationDate datetime default getdate() 
); 

create table Disaster_Event 
( 
 eventID int identity(1,1) primary key, 
 eventName varchar(100) not null, 
 disasterType varchar(50) not null, 
 location varchar(200) not null, 
 severityLevel varchar(20), 
 startDate datetime, 
 endDate datetime, 
 status varchar(20) default 'Active' check (status in ('Active', 'Resolved', 'Closed')), 
 check (endDate is null or startDate is null or endDate >= startDate) 
); 

create table Emergency_Report 
( 
 reportID int identity(1,1) primary key, 
 citizenID int check (citizenID > 0), 
 eventID int not null check (eventID > 0), 
 operatorID int check (operatorID > 0), 
 location varchar(200) not null, 
 disasterType varchar(50), 
 severityLevel varchar(20), 
 timeOfReport datetime default getdate(), 
 status varchar(20) default 'Pending' check (status in ('Pending', 'Verified', 'Assigned', 'Resolved', 'Cancelled')), 
 foreign key (citizenID) references Citizen(citizenID) 
 on update no action on delete no action, 
 foreign key (eventID) references Disaster_Event(eventID) 
 on update no action on delete no action, 
 foreign key (operatorID) references [User](userID) 
 on update no action on delete no action 
); 

create table Rescue_Team 
( 
 teamID int identity(1,1) primary key, 
 teamName varchar(100) not null, 
 teamType varchar(50) not null check (teamType in ('Medical', 'Fire', 'Rescue')), 
 currentLocation varchar(255), 
 availabilityStatus varchar(20) default 'Available' check (availabilityStatus in ('Available', 'Busy', 'Assigned', 'Completed')), 
 capacity int check (capacity >= 0) 
); 

create table Team_Assignment 
( 
 assignmentID int identity(1,1) primary key, 
 teamID int not null check (teamID > 0), 
 reportID int not null check (reportID > 0), 
 assignedBy int not null check (assignedBy > 0), 
 assignedAt datetime default getdate(), 
 completedAt datetime, 
 status varchar(20) default 'Assigned' check (status in ('Assigned', 'In Progress', 'Completed', 'Cancelled')), 
 check (completedAt is null or completedAt >= assignedAt), 
 foreign key (teamID) references Rescue_Team(teamID) 
 on update no action on delete no action, 
 foreign key (reportID) references Emergency_Report(reportID) 
 on update no action on delete no action, 
 foreign key (assignedBy) references [User](userID) 
 on update no action on delete no action 
); 

create table Warehouse 
( 
 warehouseID int identity(1,1) primary key, 
 name varchar(100) not null, 
 location varchar(200) not null, 
 managerID int check (managerID > 0), 
 contactInfo varchar(100), 
 foreign key (managerID) references [User](userID) 
 on update no action on delete set null 
); 

create table Resource 
( 
 resourceID int identity(1,1) primary key, 
 resourceName varchar(100) not null, 
 resourceType varchar(50) check (resourceType in ('Food', 'Water', 'Medicine', 'Shelter')), 
 unitOfMeasure varchar(20), 
 description varchar(200) 
); 

create table Warehouse_Inventory 
( 
 inventoryID int identity(1,1) primary key, 
 warehouseID int not null check (warehouseID > 0), 
 resourceID int not null check (resourceID > 0), 
 quantityAvailable decimal(10,2) check (quantityAvailable >= 0), 
 thresholdLevel decimal(10,2) check (thresholdLevel >= 0), 
 lastUpdated datetime default getdate(), 
 unique (warehouseID, resourceID), 
 foreign key (warehouseID) references Warehouse(warehouseID) 
 on update no action on delete no action, 
 foreign key (resourceID) references Resource(resourceID) 
 on update no action on delete no action 
); 

create table Resource_Allocation 
( 
 allocationID int identity(1,1) primary key, 
 inventoryID int not null check (inventoryID > 0), 
 reportID int not null check (reportID > 0), 
 allocatedBy int not null check (allocatedBy > 0), 
 quantityRequested decimal(10,2) check (quantityRequested > 0), 
 quantityDispatched decimal(10,2) default 0 check (quantityDispatched >= 0), 
 quantityConsumed decimal(10,2) default 0 check (quantityConsumed >= 0), 
 allocationDate datetime default getdate(), 
 status varchar(20) default 'Pending' check (status in ('Pending','Approved','Dispatched','Consumed','Rejected','Cancelled')), 
 check (quantityDispatched <= quantityRequested), 
 check (quantityConsumed <= quantityDispatched), 
 foreign key (inventoryID) references Warehouse_Inventory(inventoryID) 
 on update no action on delete no action, 
 foreign key (reportID) references Emergency_Report(reportID) 
 on update no action on delete no action, 
 foreign key (allocatedBy) references [User](userID) 
 on update no action on delete no action 
); 

create table Hospital 
( 
 hospitalID int identity(1,1) primary key, 
 hospitalName varchar(100) not null, 
 location varchar(200) not null, 
 totalBeds int check (totalBeds >= 0), 
 availableBeds int, 
 contactInfo varchar(100), 
 check (availableBeds >= 0 and availableBeds <= totalBeds) 
); 

create table Patient 
( 
 patientID int identity(1,1) primary key, 
 reportID int not null check (reportID > 0), 
 hospitalID int not null check (hospitalID > 0), 
 patientName varchar(100) not null, 
 caseSeverity varchar(20), 
 admissionDate datetime default getdate(), 
 dischargeDate datetime, 
 status varchar(20) default 'Admitted' check (status in ('Admitted', 'Under Treatment', 'Discharged', 'Transferred', 'Deceased')), 
 check (dischargeDate is null or dischargeDate >= admissionDate), 
 foreign key (reportID) references Emergency_Report(reportID) 
 on update no action on delete no action, 
 foreign key (hospitalID) references Hospital(hospitalID) 
 on update no action on delete no action 
); 

create table Donation 
( 
 donationID int identity(1,1) primary key, 
 eventID int not null check (eventID > 0), 
 receivedBy int check (receivedBy > 0), 
 donorName varchar(100), 
 donorType varchar(50), 
 amount decimal(18,2) check (amount > 0.00), 
 donationDate datetime default getdate(), 
 paymentMethod varchar(50), 
 foreign key (eventID) references Disaster_Event(eventID) 
 on update no action on delete no action, 
 foreign key (receivedBy) references [User](userID) 
 on update no action on delete set null 
); 

create table Expense 
( 
 expenseID int identity(1,1) primary key, 
 eventID int not null check (eventID > 0), 
 recordedBy int check (recordedBy > 0), 
 description varchar(255), 
 category varchar(50), 
 amount decimal(18,2) check (amount > 0.00), 
 expenseDate datetime default getdate(), 
 approvalStatus varchar(20) default 'Pending' check (approvalStatus in ('Pending', 'Approved', 'Rejected')), 
 foreign key (eventID) references Disaster_Event(eventID) 
 on update no action on delete no action, 
 foreign key (recordedBy) references [User](userID) 
 on update no action on delete set null 
); 

create table Financial_Transaction 
( 
 transactionID int identity(1,1) primary key, 
 eventID int not null check (eventID > 0), 
 recordedBy int check (recordedBy > 0), 
 transactionType varchar(20) check (transactionType in ('Donation', 'Expense', 'Procurement')), 
 amount decimal(18,2) check (amount > 0.00), 
 referenceID int not null check (referenceID > 0), 
 transactionDate datetime default getdate(), 
 foreign key (eventID) references Disaster_Event(eventID) 
 on update no action on delete no action, 
 foreign key (recordedBy) references [User](userID) 
 on update no action on delete set null 
); 

create table Approval_Request 
( 
 requestID int identity(1,1) primary key, 
 requestedBy int not null check (requestedBy > 0), 
 approvedBy int, 
 requestType varchar(50), 
 referenceType varchar(50), 
 referenceID int, 
 status varchar(20) default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')), 
 requestDate datetime default getdate(), 
 decisionDate datetime, 
 comments varchar(200), 
 check (decisionDate is null or decisionDate >= requestDate), 
 foreign key (requestedBy) references [User](userID) 
 on update no action on delete no action, 
 foreign key (approvedBy) references [User](userID) 
 on update no action on delete no action 
); 

create table Audit_Log 
( 
 logID int identity(1,1) primary key, 
 userID int check (userID > 0), 
 actionType varchar(20) not null, 
 tableAffected varchar(50) not null, 
 recordID int, 
 oldValue varchar(200), 
 newValue varchar(200), 
 timestamp datetime default getdate(), 
 foreign key (userID) references [User](userID) 
 on update no action on delete set null 
); 


-- Data Manipulation Language
use DB_Project
insert into Role (roleName, description) values 
('Admin', 'Full system access and user management'), 
('Operator', 'Handles incoming emergency reports'), 
('Field Officer', 'Coordinates on-ground rescue teams'), 
('Warehouse Manager', 'Manages inventory and logistics'), 
('Finance Officer', 'Tracks donations and expenses'); 

insert into Permission (permissionName, resource, action) values 
('Manage Users', 'UserTable', 'Create'), 
('View Reports', 'EmergencyTable', 'Read'), 
('Allocate Resources', 'InventoryTable', 'Update'), 
('Delete Reports', 'EmergencyTable', 'Delete'); 

insert into Role_Permission (roleID, permissionID) values 
(1, 1), 
(1, 2), 
(1, 3), 
(1, 4), 
(2, 2), 
(3, 2), 
(4, 3), 
(5, 2); 

insert into [User] (name, email, roleID, isActive, passwordHash) values 
('Zain Ahmed', 'admin@disaster.gov.pk', 1, 1, 'password123'), 
('Areeba Khan', 'operator@disaster.gov.pk', 2, 1, 'password123'), 
('Bilal Raza', 'fieldofficer@disaster.gov.pk', 3, 1, 'password123'), 
('Hamza Ali', 'warehouse@disaster.gov.pk', 4, 1, 'password123'), 
('Sara Imran', 'finance@disaster.gov.pk', 5, 1, 'password123'); 

insert into Citizen (name, phone, address) values 
('Usman Tariq', '03001234567', 'Rawalpindi'), 
('Hina Javed', '03111234567', 'Islamabad'); 

insert into Disaster_Event (eventName, disasterType, location, severityLevel, startDate, endDate, status) values 
('Monsoon Floods 2026', 'Flood', 'Sindh/South Punjab', 'High', '2026-04-15', null, 'Active'), 
('Margalla Hills Fire', 'Fire', 'Islamabad', 'Medium', '2026-04-20', null, 'Active'),
('Monsoon Floods - North', 'Flood', 'KPK', 'High', '2026-04-18', null, 'Active'),
('Karachi Cyclone Alert', 'Flood', 'Sindh Coast', 'High', '2026-04-25', null, 'Active'),
('Industrial Fire - Korangi', 'Fire', 'Karachi', 'Medium', '2026-04-22', null, 'Active'),
('Earthquake Tremors - Gilgit', 'Earthquake', 'Gilgit-Baltistan', 'Medium', '2026-04-28', null, 'Active'),
('Landslide Warning - Murree', 'Landslide', 'Murree Hills', 'High', '2026-04-30', null, 'Active'); 

insert into Emergency_Report (citizenID, eventID, operatorID, location, disasterType, severityLevel, status) values 
(1, 1, 2, 'Sukkur', 'Flood', 'High', 'Pending'), 
(2, 2, 2, 'Trail 3, Margalla Hills', 'Fire', 'Medium', 'Pending'); 

insert into Rescue_Team (teamName, teamType, currentLocation, availabilityStatus, capacity) values 
('Alpha Unit', 'Medical', 'Sector F-6', 'Available', 10), 
('Bravo Unit', 'Fire', 'Blue Area', 'Available', 15); 

insert into Team_Assignment (teamID, reportID, assignedBy, assignedAt, completedAt, status) values 
(1, 1, 3, '2026-04-16 09:00:00', null, 'Assigned'), 
(2, 2, 3, '2026-04-21 11:00:00', null, 'Assigned'); 

insert into Warehouse (name, location, managerID, contactInfo) values 
('Central Supply Hub', 'I-9 Industrial Area, Islamabad', 4, '051-111222333'), 
('North Relief Depot', 'Peshawar Road, Rawalpindi', 4, '051-444555666'); 

insert into Resource (resourceName, resourceType, unitOfMeasure, description) values 
('Mineral Water', 'Water', 'Liters', '1.5L Bottles'), 
('Medical Kits', 'Medicine', 'Box', 'Basic First Aid'), 
('Rescue Tents', 'Shelter', 'Unit', 'Weather-resistant 4-person tents'), 
('Dry Food Packs', 'Food', 'Pack', 'Ready-to-eat meal packs'); 

insert into Warehouse_Inventory (warehouseID, resourceID, quantityAvailable, thresholdLevel) values 
(1, 1, 5000, 500), 
(1, 2, 200, 50), 
(1, 3, 100, 20), 
(2, 4, 800, 100); 

insert into Resource_Allocation (inventoryID, reportID, allocatedBy, quantityRequested, quantityDispatched, quantityConsumed, allocationDate, status) values 
(1, 1, 4, 300.00, 250.00, 200.00, '2026-04-16 10:00:00', 'Dispatched'), 
(4, 2, 4, 100.00, 80.00, 50.00, '2026-04-21 12:00:00', 'Dispatched'); 

insert into Hospital (hospitalName, location, totalBeds, availableBeds, contactInfo) values 
('PIMS', 'G-8, Islamabad', 500, 45, '051-9261170'), 
('Mayo Hospital', 'Lahore', 800, 12, '042-9921230'); 

insert into Patient (reportID, hospitalID, patientName, caseSeverity, admissionDate, dischargeDate, status) values 
(1, 1, 'Ali Hassan', 'Critical', '2026-04-16 13:00:00', null, 'Admitted'), 
(2, 1, 'Fatima Noor', 'Moderate', '2026-04-21 13:30:00', null, 'Admitted'); 

insert into Donation (eventID, receivedBy, donorName, donorType, amount, donationDate, paymentMethod) values 
(1, 5, 'Pak Relief Foundation', 'NGO', 500000.00, '2026-04-17', 'Bank Transfer'), 
(2, 5, 'Ahmed Enterprises', 'Company', 150000.00, '2026-04-22', 'Cheque'); 

insert into Expense (eventID, recordedBy, description, category, amount, expenseDate, approvalStatus) values 
(1, 5, 'Purchase of emergency medicine', 'Medical', 120000.00, '2026-04-17', 'Pending'), 
(2, 5, 'Fuel for fire response vehicles', 'Transport', 40000.00, '2026-04-22', 'Pending'), 
(1, 5, 'Procurement of water tanks', 'Procurement', 80000.00, '2026-04-18', 'Approved'); 

insert into Financial_Transaction (eventID, recordedBy, transactionType, amount, referenceID, transactionDate) values 
(1, 5, 'Donation', 500000.00, 1, '2026-04-17'), 
(1, 5, 'Expense', 120000.00, 1, '2026-04-17'), 
(1, 5, 'Procurement', 80000.00, 3, '2026-04-18'); 

insert into Approval_Request (requestedBy, approvedBy, requestType, referenceType, referenceID, status, requestDate, decisionDate, comments) values 
(4, 1, 'Resource Dispatch', 'Resource_Allocation', 1, 'Approved', '2026-04-16 09:30:00', '2026-04-16 09:45:00', 'Approved for urgent dispatch'), 
(3, null, 'Team Deployment', 'Team_Assignment', 2, 'Pending', '2026-04-21 11:15:00', null, 'Awaiting admin review'); 

insert into Audit_Log (userID, actionType, tableAffected, recordID, oldValue, newValue) values 
(1, 'Create', 'User', 2, null, 'Created operator account'), 
(4, 'Update', 'Warehouse_Inventory', 1, '5000', '4750'); 

USE DB_Project;
GO

-- 1. Check the 5 most recent incidents reported
SELECT TOP 5 
    reportID, 
    location, 
    disasterType, 
    severityLevel, 
    status, 
    timeOfReport
FROM Emergency_Report
ORDER BY timeOfReport DESC;

-- 2. Check the 5 most recent users created
SELECT TOP 5 
    userID, 
    name, 
    email, 
    isActive, 
    createdAt
FROM [User]
ORDER BY createdAt DESC;

-- 3. Check the most recent system activity (Triggers at work!)
SELECT TOP 10 
    logID, 
    timestamp, 
    actionType, 
    tableAffected, 
    recordID, 
    newValue
FROM Audit_Log
ORDER BY timestamp DESC;

-- Check if the incident and the audit log (via trigger) were created
SELECT er.reportID, er.location, er.status, al.actionType, al.newValue
FROM Emergency_Report er
JOIN Audit_Log al ON er.reportID = al.recordID
WHERE er.location = 'Karachi' AND al.tableAffected = 'Emergency_Report';


-- Check if quantity decreased and if stockStatus updated (via trigger)
SELECT resourceName, quantityAvailable, thresholdLevel, stockStatus 
FROM v_ResourceInventorySummary 
WHERE resourceName = 'Mineral Water';


-- Check if the Donation table AND the Financial_Transaction table (via trigger) were updated
SELECT d.amount, d.donorName, ft.transactionType, ft.amount as LedgerAmount
FROM Donation d
JOIN Financial_Transaction ft ON d.donationID = ft.referenceID
WHERE d.amount = 50000 AND ft.transactionType = 'Donation';

-- The "Everything" Monitor
SELECT TOP 10 timestamp, userName, actionType, tableAffected, newValue
FROM v_AuditTrail
ORDER BY timestamp DESC;
