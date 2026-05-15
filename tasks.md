# tasks.md — Task List

---

## 🚀 Current Focus: Production Polish & Scaling
- [ ] **QA Audit:** Test the full "Golden Path" (Booking $\rightarrow$ Payment $\rightarrow$ Notification $\rightarrow$ Admin Confirm) on real mobile devices.
- [ ] **Performance:** Optimize image loading for the gallery to maintain the "Luxury" feel.
- [ ] **Edge Cases:** Handle payment failures or expired booking codes gracefully.
- [ ] **Security:** Review Supabase RLS policies to ensure customers can only see their own bookings.

---

## 📦 Phase 3 — Template Product (B2B)
- [ ] **Configuration Layer:** Move all shop-specific data (prices, colors, LINE IDs) into a single `config.ts` or DB table for easy rebranding.
- [ ] **Theming System:** Implement a way to change the primary color (e.g., Rose Gold to Gold/Silver) globally.
- [ ] **Onboarding:** Create a "Quick Setup" guide for new salon owners.
- [ ] **Demo Site:** Deploy a separate "Demo" version of the app for potential buyers.

---

## ✅ Done (The Heavy Lifting)

### Core MVP
- [x] Luxury Landing Page & Home
- [x] Service Listing & Pricing
- [x] Booking Flow with unique codes
- [x] Admin Dashboard (Basic)
- [x] Calendar Management

### Advanced Growth Features
- [x] PromptPay Integration with automated SlipOK verification
- [x] LINE LIFF & Auth integration
- [x] Automated Reminders (Cron)
- [x] Member Portal & Points System
- [x] Finance Dashboard with Revenue Charts
- [x] Rewards & Promotions Management
- [x] Digital Receipt System
- [x] Customer & Service Management
- [x] Multi-channel notifications (LINE, Telegram)
