# NetHub User Manual
## Presentation Flow Guide

**Version 2.0 | April 2026**

---

## 📋 Table of Contents

1. [Introduction & Overview](#1-introduction--overview)
2. [Getting Started](#2-getting-started)
3. [Login & First-Time Setup](#3-login--first-time-setup)
4. [Dashboard Overview](#4-dashboard-overview)
5. [Agent Management](#5-agent-management)
6. [Application Management](#6-application-management)
7. [Subscriber Management](#7-subscriber-management)
8. [Commission Management](#8-commission-management)
9. [Analytics & Reports](#9-analytics--reports)
10. [Events Calendar](#10-events-calendar)
11. [Agent Portal](#11-agent-portal)
12. [Profile Settings](#12-profile-settings)
13. [Troubleshooting & Best Practices](#13-troubleshooting--best-practices)

---

## 1. Introduction & Overview

### What is NetHub?

NetHub is a comprehensive network operations management system designed to streamline the process of managing fiber internet applications, agents, subscribers, and commissions across multiple branch locations.

### Key Features

- ✅ **Multi-Branch Management** - Manage operations across multiple branch locations with role-based access control
- ✅ **Agent Network System** - Track agents, team leaders, and referral networks with unique referral codes
- ✅ **Application Processing** - Handle customer applications from submission to activation with document verification
- ✅ **Commission Tracking** - Automated commission calculation with pending, eligible, and paid status tracking
- ✅ **Real-Time Analytics** - Dashboard with key metrics, conversion rates, and performance reports
- ✅ **Agent Portal** - Public-facing portal where agents can track their applications, subscribers, and commissions

### Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Shadcn/ui, Recharts  
**Backend:** Node.js, Express, TypeScript, Supabase (PostgreSQL), JWT

---

## 2. Getting Started

### System Requirements

- 🌐 Modern web browser (Chrome, Firefox, Safari, Edge)
- 📡 Internet connection
- 🔑 Valid user credentials

### Accessing the System

**Step 1:** Navigate to your system URL  
**Step 2:** Click "Login" or navigate to `/login`  
**Step 3:** Enter your email and password  
**Step 4:** Complete 2FA verification if enabled

### Default Admin Credentials

- **Email:** `admin@example.com`
- **Password:** `Admin123!`

> ⚠️ **Important:** Change the default password immediately after first login

---

## 3. Login & First-Time Setup

### First Login Process

#### Step 1: Initial Login
- Use the temporary password provided by your administrator
- You'll be prompted to change your password immediately

#### Step 2: Change Password
- Enter a new secure password (minimum 8 characters)
- Confirm the new password
- Optionally upload a profile picture

#### Step 3: Onboarding Tour
- After changing your password, an interactive tour will guide you through the system
- You can skip the tour and access it later from settings

### Password Requirements

- ✅ Minimum 8 characters
- ✅ Mix of uppercase and lowercase letters recommended
- ✅ Include numbers and special characters for better security

---

## 4. Dashboard Overview

### Header Components

| Component | Description |
|-----------|-------------|
| **Branch Badge** | Shows your assigned branch (visible at all times) |
| **Theme Toggle** | Switch between light and dark mode |
| **User Menu** | Access profile, settings, and logout |

### Sidebar Navigation

| Menu Item | Purpose |
|-----------|---------|
| **Analytics** | View system metrics and reports |
| **Agents** | Manage agent information |
| **Portal** | Quick access to agent portal |
| **Applications** | Process customer applications |
| **Subscribers** | Manage active subscribers |
| **Commissions** | Track and manage agent commissions |
| **Events** | Calendar for important dates |

---

## 5. Agent Management

### Creating a New Agent

**Step 1:** Click **"Create Agent"** button

**Step 2:** Fill in agent information:
- **Name** (required) - Agent's full name
- **Contact Number** (optional) - Phone number
- **Email** (optional) - Email address
- **Role** - Select CBA, Team Leader, or Organic
- **Team Leader** (optional) - Assign to a team leader

**Step 3:** Click **"Create"**

> ✅ **Note:** Agent is automatically assigned to your branch

### Copying Referral Links

- **Copy Referral Code:** Click on the referral code
- **Copy Full Link:** Click the copy icon next to the code

### Agent Filters

Filter agents by:
- 🔍 **Search** - Name, email, referral code, or contact number
- 📊 **Status** - Active or Inactive
- 👤 **Role** - Team Leader, CBA, or Organic
- 👥 **Team Leader** - Filter by team leader

---

## 6. Application Management

### Application Statuses

| Status | Description |
|--------|-------------|
| **Submitted** | New application received |
| **Under Review** | Being reviewed by staff |
| **Approved** | Application approved, awaiting installation |
| **Scheduled for Installation** | Installation date set |
| **Activated** | Service activated (becomes subscriber) |
| **Denied** | Application rejected |
| **Voided** | Application cancelled |

### Processing Applications: Step-by-Step

#### Step 1: Review New Application

1. Click on an application with **"Submitted"** status
2. Review customer information:
   - Personal details (name, birthday, contact)
   - Address and location (map view)
   - Selected plan
   - Referring agent
3. Check uploaded documents:
   - House photo
   - Government ID
   - ID selfie
   - Proof of billing (for Business plans)
   - Proof of income (for Business plans)

#### Step 2: Verify Information

- ✅ Ensure all required documents are uploaded and clear
- ✅ Verify government ID matches the applicant's selfie
- ✅ Check if the address is within service area
- ✅ Confirm contact number is valid
- ✅ For Business plans, verify proof of billing and income

#### Step 3: Update Status

**If Approved:**
1. Change status to **"Under Review"** (if additional verification needed)
2. Or change to **"Approved"** (if ready for installation)
3. Click **"Update Status"**

**If Denied:**
1. Change status to **"Denied"**
2. Select or enter a reason:
   - Incomplete documents
   - Invalid ID
   - Outside service area
   - Failed verification
   - Other (specify reason)
3. Click **"Update Status"**

#### Step 4: Schedule Installation

1. For approved applications, coordinate with installation team
2. Set installation date and time
3. Change status to **"Scheduled for Installation"**
4. Notify customer of installation schedule

#### Step 5: Activate Service (Elevate to Subscriber)

> 🎯 **This is the final step that converts an application into an active subscriber!**

1. After successful installation, open the application
2. Change status to **"Activated"**
3. Click **"Update Status"**
4. System automatically:
   - ✅ Creates subscriber record
   - ✅ Generates commission for the referring agent
   - ✅ Updates analytics and reports
   - ✅ Moves application to Subscribers list

> ⚠️ **Important:** Only activate after confirming the service is installed and working. This action triggers commission calculation.

### Application Documents

| Document | Description |
|----------|-------------|
| **House Photo** | Exterior view of installation location |
| **Government ID** | Valid government-issued identification |
| **ID Selfie** | Applicant holding their ID |
| **Proof of Billing** | Utility bill or similar (Business plans) |
| **Proof of Income** | Income verification (Business plans) |

### Voiding an Application

If an application needs to be cancelled:

1. Open the application
2. Change status to **"Voided"**
3. Enter reason for voiding:
   - Customer request
   - Duplicate application
   - No longer interested
   - Other (specify)
4. Click **"Update Status"**

---

## 7. Subscriber Management

### Viewing Subscribers

1. Navigate to **Subscribers** from the sidebar
2. View all activated applications (subscribers)
3. Filter by agent, plan, or date range

### Exporting Data

1. Click **"Export"** button
2. Select filters (optional)
3. Download CSV file with subscriber data

### Downloading Documents

1. Click on a subscriber
2. Click **"Download Documents"** button
3. ZIP file with all documents is downloaded

---

## 8. Commission Management

### Commission Statuses

| Status | Description |
|--------|-------------|
| **Pending** | Commission awaiting management approval |
| **Eligible** | Ready to be paid (approved by management) |
| **Paid** | Commission has been paid to agent |

### Commission Calculation

- ✅ Commissions are automatically created when an application is activated
- ✅ Amount is based on the plan's commission rate
- ✅ Status changes to "Eligible" when approved by management

### Updating Commission Status

1. Click on a commission
2. Change status to "Paid"
3. Enter payment date
4. Confirm with your password

---

## 9. Analytics & Reports

### Overview

Analytics Dashboard provides real-time insights into business performance, agent productivity, and operational health. All data filtered by assigned branch.

### Key Performance Indicators (KPIs)

Four main metrics displayed at top:

| Metric | Description | Purpose |
|--------|-------------|---------|
| **Subscribers This Month** | Total activations current month | Track monthly growth |
| **Conversion Rate** | % of applications activated | Measure sales effectiveness |
| **Pending Applications** | Apps awaiting processing | Monitor workload |
| **Commissions Due** | Total eligible commissions (₱) | Track payables |

### Core Reports

#### 1. Application Pipeline
Shows count by status: Submitted, Under Review, Approved, Scheduled, Activated, Denied, Voided. Quick health check of workflow.

#### 2. Agent Rankings
- Top 5 agents by activations
- Toggle: Monthly or Quarterly view
- Medal system: 🥇 Gold, 🥈 Silver, 🥉 Bronze

#### 3. Subscribers per Plan
- Breakdown by plan name and category
- Shows count and percentage
- Visual color coding

#### 4. Subscription Trends
- 12-month line graph
- Shows activation patterns
- Identifies seasonal trends

#### 5. Pipeline Duration
- Average days from Submitted → Activated
- Measures process efficiency
- Lower = faster service

#### 6. Monthly Recurring Revenue (MRR)
- Total revenue from active subscribers
- Based on plan pricing
- Key financial metric

#### 7. Plan Category Distribution
- Residential vs Business split
- Percentage breakdown
- Progress bar visualization

#### 8. Top Denial Reasons
- Most common rejection causes
- Helps identify process issues
- Top 5 displayed

#### 9. Agent Commission Breakdown
- Table view: Eligible, Paid, Total per agent
- Track payment status
- Financial transparency

#### 10. Agent Conversion Rates
- Top 5 agents by conversion %
- Shows activated/total applications
- Color coded: Green (≥70%), Teal (≥50%), Orange (<50%)

#### 11. Plan Category Performance
- Conversion rate by Residential/Business
- Identifies which plans convert better
- Progress bar visualization

#### 12. Installation Failure Rate (Void Rate)
- % of voided applications
- Lower = better installation success
- Red flag if high

#### 13. Month-over-Month Growth
- Last 6 months comparison
- Shows growth rate %
- Green (positive), Red (negative)

#### 14. Subscriber Locations Map
- Interactive map with markers
- Geographic distribution
- Click markers for subscriber details
- Shows plan category by color

### Operational Alerts

**Stuck Applications Alert**
- Red banner if apps unchanged 30+ days
- Lists customer name, status, days stuck
- Prompts immediate action

### Data Refresh

**Refresh Button** (top right)
- Clears cache
- Fetches latest data
- Use after major updates

> 📊 **Note:** All analytics branch-filtered. Superadmins see all branches, staff see assigned branch only.

---

## 10. Events Calendar

### Creating an Event

**Step 1:** Click **"Create Event"** button or click on a date

**Step 2:** Fill in event details:
- **Title** (required) - Event name
- **Description** (optional) - Event details
- **Start Date & Time** (required)
- **End Date & Time** (required)
- **All Day** (checkbox) - For full-day events
- **Color** (optional) - Event color for calendar

**Step 3:** Click **"Create"**

---

## 11. Agent Portal

### Overview

The Agent Portal is a public-facing page where agents can access their personalized dashboard without logging into the admin system. Each agent has a unique referral code that gives them access to their portal.

### Accessing the Agent Portal

#### Method 1: From Dashboard

1. Click **"Portal"** in the sidebar navigation
2. You'll see the portal URL and an **"Open Agent Portal"** button
3. Click **"Copy"** to copy the portal URL
4. Share this URL with your agents

#### Method 2: Agent Access

1. Agents visit the portal URL (e.g., `https://ufl-sys.up.railway.app/agent`)
2. They enter their unique referral code
3. System displays their personalized dashboard

### Agent Portal Features

#### Dashboard Statistics

Agents can view real-time statistics:
- **Pending Applications** - Number of applications awaiting processing
- **Total Subscribers** - Number of activated subscribers
- **Eligible Commissions** - Total commissions ready to be paid
- **Paid Commissions** - Total commissions already received

#### Applicants Tab

View all applications submitted through their referral link:
- Applicant name and contact number
- Selected plan and pricing
- Installation address (clickable to view on map)
- Current status (Submitted, Under Review, Approved, etc.)
- Application date

> 📝 **Note:** Activated applications automatically move to the Subscribers tab.

#### Subscribers Tab

View all activated subscribers:
- Subscriber name and contact number
- Active plan and pricing
- Installation address (clickable to view on map)
- Activation date

#### Commissions Tab

Track commission earnings:
- Subscriber name and plan
- Commission amount
- Status: Pending, Eligible, or Paid
- Activation or payment date

**Commission Timeline:**
- **Pending** - Awaiting management approval
- **Eligible** - Approved by management, ready to be paid
- **Paid** - Commission has been disbursed

#### My Team Tab (Team Leaders Only)

Team Leaders can view and manage their team members:
- Team member names and roles
- Individual referral codes
- Contact information
- Quick copy buttons for referral codes and links

> ✅ **Team Leader Benefits:** Easily share team member referral links and track team performance.

### Sharing Referral Links

#### Method 1: Copy from Agent Management

1. Go to **Agents** page in dashboard
2. Find the agent in the list
3. Click the **copy icon** next to their referral code
4. Share the copied link via messaging apps, email, or social media

#### Method 2: Agent Self-Service

1. Agent accesses their portal using their referral code
2. Their unique referral link is displayed in the header
3. Agent can copy and share their own link

#### Method 3: Team Leader Distribution

1. Team Leader accesses their portal
2. Clicks on **"My Team"** tab
3. Uses **"Copy Code"** or **"Copy Link"** buttons for each team member
4. Distributes links to team members

### Referral Link Format

Referral links follow this format:

```
https://ufl-sys.up.railway.app/agent/[REFERRAL_CODE]
```

Example: `https://ufl-sys.up.railway.app/agent/ABC123`

> 💡 **Best Practice:** Encourage agents to save their referral link in their phone's notes or messaging app for quick sharing with potential customers.

### Viewing Location on Map

Both applicants and subscribers have clickable addresses:

1. Click on any address in the Applicants or Subscribers tab
2. Interactive map opens showing the location
3. Map displays the customer's name and full address
4. Close the map by clicking the X button

### Portal Benefits

- ✅ No login required - agents use their referral code
- ✅ Real-time updates on applications and commissions
- ✅ Mobile-friendly design for on-the-go access
- ✅ Dark mode support for comfortable viewing
- ✅ Easy link sharing for customer acquisition
- ✅ Transparent commission tracking

---

## 12. Profile Settings

### Updating Profile

1. Click on your avatar in the top-right corner
2. Select **"Profile"** from the dropdown menu
3. Change your full name or upload a new profile picture
4. Click **"Save Changes"**

### Changing Password

1. Go to **Settings** from user menu
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click **"Change Password"**

---

## 13. Troubleshooting & Best Practices

### Common Issues

#### Cannot Login

- ✅ Verify email and password are correct
- ✅ Check if account is active (contact your system administrator)
- ✅ Clear browser cache and cookies
- ✅ Try a different browser

#### Not Seeing Expected Data

- ✅ Check date range filters
- ✅ Ensure you have proper permissions
- ✅ Refresh the page
- ✅ Contact your system administrator

#### Commission Not Showing as Eligible

- ✅ Verify commission has been approved by management
- ✅ Check that application status is "Activated"
- ✅ Refresh the page
- ✅ Contact your system administrator if issue persists

### Best Practices

#### Security

- 🔒 Use strong, unique passwords
- 🔄 Change passwords regularly
- 🚫 Never share passwords
- 🚪 Log out when finished
- 👀 Don't leave system unattended

#### Data Management

- 📅 Check pending applications daily
- ⚡ Process applications promptly
- 💰 Update commission statuses regularly
- 📝 Keep agent information up to date
- ✅ Verify customer information before activation

---

## 📞 Support & Contact

For additional support or questions, please contact your system administrator.

---

**© 2026 UrbanTel. All rights reserved.**

---

## Presentation Tips

### For Training Sessions

1. **Introduction (5 min)** - Cover sections 1-2
2. **System Access (5 min)** - Cover section 3
3. **Navigation (5 min)** - Cover section 4
4. **Core Workflows (20 min)** - Cover sections 5-8
5. **Reporting & Tools (10 min)** - Cover sections 9-10
6. **Agent Portal Deep Dive (15 min)** - Cover section 11
7. **Q&A and Troubleshooting (10 min)** - Cover sections 12-13

### For Quick Reference

Use the Table of Contents to jump to specific sections as needed during live demonstrations or training sessions.

### For Self-Paced Learning

Recommend users follow the sections in order, completing hands-on exercises after each major section (5, 6, 7, 8, 11).
