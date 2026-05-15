# architecture.md — System Architecture

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 (App Router) + TS | Latest performance and server-side capabilities |
| Styling | Tailwind CSS 4 | Modern utility-first styling |
| Backend | Supabase (Auth, DB, Storage) | Scalable backend-as-a-service |
| Payments | PromptPay + SlipOK | Localized Thai payment automation |
| Integration | LINE LIFF + Messaging API | Primary communication channel for Thai market |
| Analytics | Recharts | Visualizing financial growth |
| Reminders | Cron Jobs (Vercel/Edge) | Automated customer appointment alerts |

---

## Folder Structure

```
src/
├── app/
│   ├── (public)/           # Landing, Services, How-to, Book flow
│   ├── admin/              # Finance, Calendar, Rewards, Promotions, Customers
│   ├── api/                # Payments, LINE webhooks, Cron, Auth
│   └── member/             # Member portal, Points tracking
├── components/             # UI components, CustomerCalendar, etc.
└── lib/                    # Supabase, PromptPay, SlipOK, LINE clients, Types
```

---

## Database Schema (Key Tables)

- `users`: Profiles, LINE IDs, and Auth
- `services`: Nail services, prices, and durations
- `bookings`: Appointment details, status, and booking codes
- `payments`: Transaction logs and SlipOK verification status
- `rewards_points`: Customer loyalty balance and history
- `promotions`: Active discount offers and rules
- `shop_settings`: Global configuration for the salon

---

## Key API Flows

1. **Booking Flow:** `Client` $\rightarrow$ `api/bookings` $\rightarrow$ `Booking Code Generated` $\rightarrow$ `Confirmation`
2. **Payment Flow:** `User Uploads Slip` $\rightarrow$ `api/payments/verify-slip` $\rightarrow$ `SlipOK API` $\rightarrow$ `Payment Confirmed`
3. **Notification Flow:** `Cron Trigger` $\rightarrow$ `api/cron/reminders` $\rightarrow$ `LINE Messaging API` $\rightarrow$ `Customer`
4. **Auth Flow:** `LINE Login` $\rightarrow$ `api/auth/line/callback` $\rightarrow$ `Supabase Session`
