# Implementation Plan: UrbanConnect ISP System

## Overview

This implementation plan covers the development of a web-based ISP application system with Next.js frontend, Node.js backend, Supabase database, and role-based access control. The system handles customer applications via agent referral links, application workflow management, commission tracking, and automated data retention compliance.

## Tasks

- [x] 1. Set up project structure and core infrastructure
  - Initialize Next.js project with TypeScript and Tailwind CSS
  - Set up separate Node.js backend server with TypeScript
  - Configure Supabase client and environment variables
  - Set up project folder structure (components, pages, api, lib, types)
  - Configure ESLint and Prettier
  - _Requirements: Tech stack setup_

- [ ] 2. Database schema and Supabase configuration
  - [x] 2.1 Design and create database schema
    - Create users table (superadmin, admin roles)
    - Create agents table (id, name, referral_code, contact_info)
    - Create plans table (name, category, speed, price, inclusions)
    - Create applications table (customer info, status, agent_id, plan_id, location, timestamps)
    - Create commissions table (agent_id, subscriber_id, amount, status, date_activated, date_paid)
    - Create audit_log table (for purge tracking)
    - Set up foreign key relationships and indexes
    - _Requirements: Data model, user roles, commission tracking_
  
  - [x] 2.2 Configure Supabase Storage buckets
    - Create storage bucket for customer documents (house photos, IDs, selfies, signatures)
    - Set up storage policies for authenticated access only
    - Configure file size limits and allowed MIME types
    - _Requirements: Document uploads, file storage_
  
  - [x] 2.3 Set up Supabase Auth
    - Configure email/password authentication
    - Enable 2FA for admin and superadmin roles
    - Create RLS (Row Level Security) policies for role-based access
    - _Requirements: Authentication, role-based access_

- [x] 3. Backend API foundation
  - [x] 3.1 Set up Express.js server with TypeScript
    - Initialize Express app with CORS and body-parser
    - Set up middleware for error handling and logging
    - Configure Supabase client for backend
    - Create base route structure (/api/auth, /api/customers, /api/subscribers, /api/commissions, /api/analytics, /api/export)
    - _Requirements: API layer architecture_
  
  - [x] 3.2 Implement authentication middleware
    - Create JWT verification middleware
    - Create role-based authorization middleware (checkAdmin, checkSuperadmin)
    - Implement session management
    - _Requirements: Role-based access control_

- [x] 4. Agent management system
  - [x] 4.1 Implement agent CRUD operations (backend)
    - Create POST /api/agents endpoint (superadmin only)
    - Create GET /api/agents endpoint (list all agents)
    - Create PUT /api/agents/:id endpoint (update agent)
    - Create DELETE /api/agents/:id endpoint (soft delete)
    - Generate unique referral code on agent creation
    - _Requirements: Agent registration, referral system_
  
  - [x] 4.2 Build agent management UI (frontend)
    - Create agent list page with table view
    - Create agent creation form modal
    - Create agent edit form
    - Display referral link for each agent
    - Add copy-to-clipboard functionality for referral links
    - _Requirements: User and agent management (superadmin)_

- [x] 5. Public customer application form
  - [x] 5.1 Build application form UI
    - Create public form page accessible via /apply?ref=[agent_id]
    - Build personal information section (first name, middle name, last name, birthday)
    - Build plan selection interface with categorized plans (Residential, Business)
    - Display plan details (speed, price, inclusions)
    - _Requirements: Customer application form, plan selection_
  
  - [x] 5.2 Implement geolocation and map interface
    - Integrate browser Geolocation API to auto-grab coordinates
    - Integrate Leaflet.js for fallback manual location pinning
    - Store coordinates and address on form submission
    - _Requirements: Location capture with map fallback_
  
  - [x] 5.3 Implement image upload with client-side compression
    - Create file upload components for house photo, government ID, signatures, ID selfie
    - Integrate browser-image-compression library
    - Compress images to PNG format before upload
    - Validate file types and sizes
    - _Requirements: Photo and document uploads with compression_
  
  - [x] 5.4 Implement form submission logic
    - Create POST /api/applications endpoint
    - Validate referral code from URL parameter
    - Upload compressed images to Supabase Storage
    - Store application data with status "Submitted"
    - Link application to referring agent
    - Return confirmation to user
    - _Requirements: Application submission, agent referral tracking_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Application review and management system
  - [x] 7.1 Build application list view (backend)
    - Create GET /api/applications endpoint with filtering (status, agent, date range)
    - Create GET /api/applications/:id endpoint (single application details)
    - Create PUT /api/applications/:id/status endpoint (update status)
    - Implement status transition validation
    - _Requirements: Application review workflow_
  
  - [x] 7.2 Build application review UI (frontend)
    - Create applications dashboard page
    - Build filterable table view (by status, agent, date)
    - Create application detail modal with all customer information
    - Display uploaded documents with image viewer
    - Build status update dropdown (Submitted → Under Review → Approved → Scheduled for Installation → Activated / Denied / Voided)
    - Add reason field for Denied and Voided statuses
    - _Requirements: Application management, status tracking_
  
  - [x] 7.3 Implement notification triggers
    - Create notification service module
    - Integrate SMS gateway API (implementation TBD based on provider)
    - Integrate Facebook Messenger API (implementation TBD)
    - Trigger notifications on status changes (Activated, Denied, Voided)
    - Send notifications to both customer and referring agent
    - _Requirements: Multi-channel notifications_

- [x] 8. Subscriber management system
  - [x] 8.1 Build subscriber list (backend)
    - Create GET /api/subscribers endpoint with filtering (agent, plan, date range)
    - Create GET /api/subscribers/:id endpoint
    - Include commission status in subscriber data
    - _Requirements: Subscriber list management_
  
  - [x] 8.2 Build subscriber list UI (frontend)
    - Create subscribers page with filterable table
    - Display subscriber name, referring agent, plan, date activated, commission status
    - Add filter by agent dropdown
    - Add filter by plan dropdown
    - Add date range filter
    - _Requirements: Subscriber list view, filtering by agent_

- [x] 9. Commission tracking system
  - [x] 9.1 Implement commission calculation logic (backend)
    - Create commission calculation function (60% of plan price)
    - Trigger commission record creation on application status change to "Activated"
    - Create PUT /api/commissions/:id/status endpoint (update commission status: Pending → Eligible → Paid)
    - _Requirements: Commission calculation, commission eligibility_
  
  - [x] 9.2 Build commission tracker UI (frontend)
    - Create commissions page with table view
    - Display subscriber name, agent, plan, date activated, commission amount, status
    - Add status update dropdown (Eligible → Paid)
    - Add filter by agent
    - Add filter by status
    - Display total commissions due (sum of Eligible commissions)
    - _Requirements: Commission tracking view, commission status management_

- [-] 10. Analytics dashboard
  - [x] 10.1 Implement analytics API endpoints
    - Create GET /api/analytics/subscribers-monthly endpoint
    - Create GET /api/analytics/subscribers-per-agent endpoint
    - Create GET /api/analytics/subscribers-per-plan endpoint
    - Create GET /api/analytics/subscription-trends endpoint
    - Create GET /api/analytics/conversion-rate endpoint
    - Create GET /api/analytics/pending-applications endpoint
    - Create GET /api/analytics/total-commissions-due endpoint
    - _Requirements: Analytics dashboard KPIs_
  
  - [x] 10.2 Build analytics dashboard UI (frontend)
    - Create analytics page with chart components
    - Display total subscribers (monthly)
    - Display subscribers per agent (bar chart)
    - Display subscribers per plan (pie chart)
    - Display subscription trend (line chart)
    - Display application conversion rate
    - Display pending applications count
    - Display total commissions due
    - _Requirements: Analytics dashboard visualization_

- [x] 11. Data export functionality
  - [x] 11.1 Implement export API endpoints
    - Create GET /api/export/subscribers endpoint (CSV format)
    - Create GET /api/export/subscribers/:id/documents endpoint (ZIP file with all images)
    - Generate CSV with subscriber data
    - Package uploaded images into downloadable ZIP
    - _Requirements: Manual data export for branch operations_
  
  - [x] 11.2 Build export UI (frontend)
    - Add "Export to CSV" button on subscribers page
    - Add "Download Documents" button per subscriber row
    - Show download progress indicator
    - _Requirements: Export and download functionality_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Data privacy and retention system
  - [x] 13.1 Implement automated data purge scheduler
    - Create scheduled job (cron) to run daily
    - Query for activated subscribers where activation date is 3+ days ago
    - Purge sensitive fields: birthday, uploaded photos/documents
    - Delete files from Supabase Storage
    - Set database fields to null
    - Log purge actions to audit_log table
    - _Requirements: Automated data retention policy, 3-day purge window_
  
  - [x] 13.2 Build purge log viewer (frontend)
    - Create purge log page (superadmin only)
    - Display audit log table with purged record metadata
    - Show purge date, subscriber ID, fields purged
    - _Requirements: Purge log visibility for superadmin_

- [x] 14. User management system (superadmin)
  - [x] 14.1 Implement user CRUD operations (backend)
    - Create POST /api/users endpoint (create admin accounts)
    - Create GET /api/users endpoint (list all users)
    - Create PUT /api/users/:id endpoint (update user)
    - Create DELETE /api/users/:id endpoint (deactivate user)
    - _Requirements: User account management (superadmin)_
  
  - [x] 14.2 Build user management UI (frontend)
    - Create users page with table view
    - Create user creation form
    - Create user edit form
    - Add deactivate user button
    - _Requirements: Admin account management_

- [x] 15. Authentication and authorization UI
  - [x] 15.1 Build login page
    - Create login form with email and password
    - Implement 2FA input for admin and superadmin
    - Handle authentication errors
    - Redirect to dashboard on successful login
    - _Requirements: Supabase Auth with 2FA_
  
  - [x] 15.2 Implement protected routes
    - Create route guards for admin and superadmin pages
    - Redirect unauthenticated users to login
    - Implement role-based route protection
    - _Requirements: Role-based access control_

- [x] 16. Integration and final wiring
  - [x] 16.1 Connect all frontend components to backend APIs
    - Wire up all form submissions
    - Wire up all data fetching
    - Implement error handling and loading states
    - Add toast notifications for user feedback
    - _Requirements: End-to-end integration_
  
  - [x] 16.2 Implement responsive design
    - Ensure all pages are mobile-responsive
    - Test on different screen sizes
    - Optimize for tablet and mobile views
    - _Requirements: Web-based application accessibility_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design document does not include correctness properties, so property-based tests are not included
- SMS and Messenger API integration methods are TBD and may require additional configuration based on provider selection
- Image compression library (browser-image-compression) should be installed during task 5.3
- Leaflet.js should be installed during task 5.2
- All TypeScript types should be defined in a shared types directory for consistency
