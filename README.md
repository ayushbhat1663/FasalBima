🌾 FasalBima – Smart Crop Insurance Platform
📌 Project Overview

FasalBima is a smart crop insurance platform designed to help farmers easily apply for crop insurance, report crop damage, track claims, and receive updates. The platform reduces paperwork and improves transparency by using digital technologies such as image analysis, weather monitoring, and claim tracking.

The main goal is to provide a simple, fast, and reliable insurance system for farmers while helping insurance companies process claims efficiently.

🎯 Objectives
Simplify crop insurance registration.
Enable online claim submission.
Detect crop damage using uploaded images.
Monitor weather conditions affecting crops.
Provide real-time claim tracking.
Reduce fraud in insurance claims.
Improve communication between farmers and insurance providers.
👥 Users of the System
1. Farmer

A farmer can:

Create an account.
Login securely.
Register crops.
Apply for crop insurance.
Upload crop damage images.
Track claim status.
View insurance history.
Receive notifications and updates.
2. Insurance Officer

An insurance officer can:

Verify farmer applications.
Review crop damage reports.
Approve or reject claims.
Manage insurance policies.
Generate reports.
3. Administrator

An administrator can:

Manage users.
Monitor platform activities.
Manage insurance schemes.
View analytics and reports.
Handle system maintenance.
🛠️ Main Services
1. User Authentication Service
Purpose

Provides secure login and registration.

Features
User Registration
User Login
Password Encryption
Forgot Password
Role-Based Access
Workflow
User creates account.
System verifies details.
User logs in.
Dashboard opens according to role.
2. Crop Registration Service
Purpose

Stores information about crops insured by farmers.

Features
Crop Name
Crop Type
Land Area
Sowing Date
Village Information
Workflow
Farmer enters crop details.
System validates information.
Crop data is stored in database.
3. Insurance Application Service
Purpose

Allows farmers to apply for insurance schemes.

Features
Insurance Scheme Selection
Premium Calculation
Online Application Submission
Policy Generation
Workflow
Farmer selects crop.
Farmer chooses insurance plan.
System calculates premium.
Application is submitted.
4. Crop Damage Detection Service
Purpose

Analyzes uploaded crop images for disease or damage.

Features
Image Upload
Disease Detection
Damage Analysis
Risk Assessment
Workflow
Farmer uploads image.
AI model processes image.
Damage percentage is estimated.
Report is generated.
5. Weather Monitoring Service
Purpose

Tracks weather conditions affecting crops.

Features
Temperature Monitoring
Rainfall Tracking
Humidity Monitoring
Weather Alerts
Workflow
Weather data is collected.
System analyzes conditions.
Alerts are generated if required.
Farmers receive notifications.
6. Claim Management Service
Purpose

Handles insurance claims after crop damage.

Features
Claim Submission
Document Upload
Claim Verification
Approval/Rejection
Workflow
Farmer submits claim.
Documents are uploaded.
Officer reviews claim.
Claim status is updated.
7. Claim Tracking Service
Purpose

Provides real-time claim progress.

Features
Pending Status
Under Review Status
Approved Status
Rejected Status
Workflow
Farmer opens dashboard.
Current claim status is displayed.
Updates are shown automatically.
8. Notification Service
Purpose

Keeps users informed about important events.

Features
Claim Updates
Policy Renewal Alerts
Weather Warnings
System Notifications
Workflow
Event occurs.
Notification is generated.
User receives alert.
9. Analytics and Reporting Service
Purpose

Provides useful insights for administrators.

Features
Insurance Statistics
Claim Statistics
Farmer Registration Reports
Revenue Reports
Workflow
Data is collected.
Reports are generated.
Admin views analytics dashboard.
🗄️ Database Modules

The system stores information in the following tables:

Users
User ID
Name
Email
Password
Role
Farmers
Farmer ID
Contact Information
Address
Crops
Crop ID
Crop Name
Area
Sowing Date
Insurance Policies
Policy ID
Scheme Name
Premium Amount
Claims
Claim ID
Damage Details
Status
Weather Data
Temperature
Humidity
Rainfall
🏗️ System Architecture
Farmer/Admin/Officer
          |
          V
    Web Application
          |
          V
      Backend API
          |
    -----------------
    |       |       |
Database  AI Model Weather API
🚀 Technologies Used
Frontend
HTML
CSS
JavaScript
Bootstrap
Backend
Python
Flask / FastAPI
Database
MySQL
SQLite
AI & Machine Learning
TensorFlow
Keras
OpenCV
APIs
Weather API
SMS/Email Notification API
