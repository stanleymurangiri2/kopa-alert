# KopaAlert Documentation

## Introduction

KopaAlert is a Next.js web application that helps small businesses in Kenya track customer debts and automatically remind customers to pay via SMS and email. Businesses manage their customers, record debts and payments, and let KopaAlert's scheduled jobs handle the reminder messaging.

**Core stack:**
- **Frontend/Backend:** Next.js (App Router)
- **Database & Auth:** Supabase (Postgres, Row Level Security)
- **SMS:** Africa's Talking
- **Email:** Resend
- **Testing:** Jest (unit) and Playwright (end-to-end)

## Table of Contents

| Document | Description |
|---|---|
| [Deployment Checklist](./deployment_checklist.md) | Steps to take the app live: Supabase migrations, RLS, and Edge Function deployment. |
| [Maintenance & Incident Response Runbook](./maintenance_runbook.md) | Ongoing monitoring guidance and protocols for common incidents (e.g. SMS dispatch failures). |
| [Project Documentation (PowerPoint)](./KopaAlert-Project-Documentation.pptx) | Final-year project documentation: abstract, objectives, architecture, and more. |
| [Architecture Diagram](../kopa_alert_architecture.png) | Visual overview of the system architecture. |

## Where to Go Next

- Setting up locally: copy `.env.example` to `.env.local` and fill in your Supabase, Resend, and Africa's Talking credentials.
- Going to production: start with the [Deployment Checklist](./deployment_checklist.md).
- Something broke in production: start with the [Maintenance Runbook](./maintenance_runbook.md).
