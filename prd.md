# prd.md — Product Requirements Document
# Update this file whenever a new feature is added or requirements change.

---

## Project Overview

**Project name:** Praewana Nail Studio
**Goal:** A high-end nail salon management system with automated payments and booking, designed to be scalable as a B2B template.
**Primary users:** Female customers aged 18–40 seeking a premium nail experience.
**Secondary users (B2B):** Nail salon owners looking for a complete digital transformation kit.

---

## User Personas

### End Customer
- Books via LINE/Web
- Pays via PromptPay with automated slip verification
- Tracks loyalty points via a member portal
- Receives automated reminders for appointments

### Shop Owner (Admin)
- Tracks daily/monthly revenue via financial dashboards
- Manages a complex calendar of services and bookings
- Controls promotional offers and rewards to drive retention
- Manages a digital portfolio of work

### Template Buyer (B2B)
- Wants a "business-in-a-box" solution
- Needs a system that handles the "boring" parts (payments, reminders, scheduling) automatically

---

## Features

### Phase 1 — MVP (COMPLETED)
- [x] Luxury Landing Page & Service List
- [x] Online Booking System (with unique booking codes)
- [x] Admin Dashboard (Bookings, Customers, Services)
- [x] Time Slot & Calendar Management

### Phase 2 — Growth (COMPLETED/ADVANCED)
- [x] **Automated Payments:** PromptPay integration with SlipOK for instant verification.
- [x] **LINE Ecosystem:** LIFF integration, LINE Auth, and Webhook notifications.
- [x] **Loyalty System:** Member portal and points tracking (Check-points).
- [x] **Financial Suite:** Revenue tracking and finance dashboard with charts.
- [x] **Marketing Tools:** Promotions and Rewards management.
- [x] **Automated Reminders:** Cron-based notification system.
- [x] **Customer Receipts:** Digital receipt generation and public view.

### Phase 3 — Template Product (CURRENT FOCUS)
- [ ] Multi-tenant support (multiple shops on one codebase)
- [ ] Per-shop custom branding (Themes/Colors)
- [ ] Buyer documentation + setup guide
- [ ] Sales landing page with pricing
- [ ] One-click deployment for new buyers

---

## Design Direction

**Style:** Luxury minimal — clean, feminine, premium feel
**Colors:** White `#FFFFFF`, Rose Gold `#B76E79`, Black `#1A1A1A`, Cream `#F5F0EB`
**Feel:** High-end beauty boutique (e.g., Dior/Glossier)
**Priority:** Mobile-first. Optimized for LINE browser and mobile Chrome/Safari.

---

## Success Metrics

- Bookings per month
- Payment automation rate (percentage of slips verified without manual check)
- Customer return rate (measured via points system)
- (Phase 3) Number of templates sold
