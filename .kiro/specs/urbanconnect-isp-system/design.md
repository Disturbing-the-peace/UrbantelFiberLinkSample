# Design Document: UrbanConnect ISP System

## Overview

UrbanConnect is a web-based ISP application system that enables potential customers to apply for internet service subscriptions through agent referrals. The system features role-based access for internal staff (Superadmin, Admin), offline agent operations via unique referral links, comprehensive application workflow management with status tracking, and automated commission tracking. The architecture emphasizes data privacy compliance with automated retention policies, manual data export capabilities for branch-specific operations, and multi-channel notifications for stakeholders.

The system handles the complete customer lifecycle from initial application through installation to activation, with built-in commission calculation (60% of plan price) and tracking for referring agents. Key technical considerations include client-side image compression, browser-based geolocation with fallback map interface, and scheduled background jobs for data purging.

## Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        PF[Public Application Form]
        AD[Admin Dashboard]
        SA[Superadmin Dashboard]
    end
    
    subgraph "Application Layer - Next.js Frontend"
        AR[Auth Routes]
        PR[Public Routes]
        DR[Dashboard Routes]
        IC[Image Compression]
        GEO[Geolocation Handler]
    end
    
    subgraph "API Layer - Node.js Backend"
        AA[Auth API]
        CA[Customer API]
        SB[Subscriber API]
        CM[Commission API]
        AN[Analytics API]
        NF[Notification Service]
        EX[Export Service]
    end
    
    subgraph "Data Layer"
        SDB[(Supabase PostgreSQL)]
        SST[Supabase Storage]
        SAUTH[Supabase Auth]
    end
    
    subgraph "External Services"
        SMS[SMS Gateway]
        MSG[Messenger API]
        MAP[Leaflet.js Maps]
    end
    
    subgraph "Background Jobs"
        CRON[Data Purge Scheduler]
    end
    
    PF --> PR
    AD --> DR
    SA --> DR
    
    PR --> CA
    DR --> AR
    AR --> AA
    DR --> SB
    DR --> CM
    DR --> AN
    DR --> EX
    
    IC --> CA
    GEO --> CA
    
    CA --> SDB
    SB --> SDB
    CM --> SDB
    AN --> SDB
    AA --> SAUTH
    
    CA --> SST
    SB --> SST
    EX --> SST
    
    NF --> SMS
    NF --> MSG
    
    CA --> NF
    SB --> NF
    
    CRON --> SDB
    CRON --> SST
    
    PR --> MAP
