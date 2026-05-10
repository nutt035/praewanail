# Full Project Audit: Praewa Nail Studio AI System

## 1) System Architecture Review

### Current Architecture
The system is a hybrid implementation consisting of a modern web frontend, a serverless backend (Next.js/Supabase), and a detached AI Agent system designed to be triggered via CLI or a Python-based LINE Bot wrapper.

**Architecture Diagram:**
```text
[Customer] 
    │
    ▼
[Website (Next.js / Tailwind v4)] <───> [Supabase (PostgreSQL / Auth / Storage)]
    │                                       ▲
    │ (Estimator API)                       │ (Data Persistence)
    ▼                                       │
[Gemini AI (Image Analysis)] ───────┐        │
                                    │        │
[LINE Messenger] <──> [Python Bot] <──┴──> [Claude CLI Agent]
                                            │
                                            ▼
                                    [AI Agent Knowledge Base]
                                    (Skills, Routines, Knowledge)
```

### Analysis
- **Missing Components:**
    - **Unified Orchestrator:** The AI Agent logic lives in markdown files and Python scripts, but there is no central "Brain" API connecting the website's user state to the AI Agent's context.
    - **Payment Gateway:** The business workflow mentions "pays", but there is no integrated payment system (e.g., Stripe, PromptPay API) beyond a manual PromptPay ID in settings.
    - **Real-time Notification Engine:** The `/api/notify` exists but is only triggered by manual/specific API calls, not automatically by AI agent events.

- **Security Issues:**
    - **Hardcoded Secrets:** `nail-salon-agent/tools/line_bot.py` contains a **plaintext LINE Channel Token and Webhook Secret**. This is a critical security vulnerability.
    - **Public Storage Policies:** The SQL script sets policies to "Public Insert/Update/Delete" for the `estimations` bucket. This allows anyone to upload or delete files from your storage.
    - **Unprotected Admin Panel:** The `/admin` routes appear to be open without a robust authentication middleware (depending on Supabase RLS, but application-level protection is missing).

- **Scalability Risks:**
    - **CLI-based AI Execution:** The LINE Bot invokes the AI by calling `subprocess.check_output(["claude", user_msg])`. This is highly inefficient, slow, and will fail in a production environment where the Claude CLI is not installed or authenticated.
    - **Synchronous API Calls:** The image estimation API is synchronous; large images or slow AI responses could lead to request timeouts.

- **Deployment Risks:**
    - **Python Dependency:** The AI Agent tools are in Python, while the rest of the app is TypeScript. Deploying this requires a mixed-environment (Node.js + Python), increasing complexity.

---

## 2) Website + AI Integration Review

### Integration Level: Low to Medium
The AI is currently "Siloed". There are two separate AI implementations:
1. **The Estimator:** Deeply integrated into the web app via Gemini API.
2. **The Agent:** Operates independently via LINE/CLI, using a knowledge base in markdown.

### Readiness Evaluation:
- **Booking Automation:** 🔴 **Not Ready.** The AI has a `booking_assistant.md` skill, but it only "summarizes" the booking. There is no actual function call (Tool Use) that writes the booking into the Supabase `bookings` table from the chat.
- **Chat Automation:** 🟡 **Partial.** The LINE bot can answer questions using the Agent's knowledge, but it lacks state management (memory of previous messages).
- **Marketing Automation:** 🟡 **Partial.** The `weekly_content.py` routine can generate content, but there is no automated posting system to Instagram/Facebook.

**Missing for Production:**
- **Tool Use (Function Calling):** The AI Agent needs a way to call `create_booking()`, `check_availability()`, and `update_customer_points()` directly in the database.
- **Shared State:** A way for the AI to know which customer is chatting based on their LINE UID.

---

## 3) Nail Salon Agent Review (nail-salon-agent/)

### Evaluation
- **Knowledge Quality:** 🟢 **Good.** The `faq.md`, `services.md`, and `brand_voice.md` are well-defined and capture the "friendly yet premium" persona.
- **Skill Prompts:** 🟡 **Basic.** The prompts are instructions rather than structured frameworks. They lack a "Step-by-step" reasoning process (Chain of Thought).
- **Missing Skills:**
    - **Loyalty Point Manager:** To handle the "points" system defined in the DB.
    - **Reminder Agent:** To automatically send LINE notifications 24h before a booking.
    - **Review Collector:** To ask customers for a review after a `completed` booking.
- **Automation Readiness:** 🔴 **Low.** The "Routines" are simple Python wrappers around CLI calls. They are not "autonomous" agents.

**Recommended New Skills:**
- `loyalty_manager.md`: Manage and redeem points.
- `availability_checker.md`: Real-time check of the `bookings` table to suggest free slots.
- `reminder_service.md`: Logic for triggering notifications.

---

## 4) Real Business Workflow Check

**Journey Simulation:**
1. **Finds Page:** ✅ (Home page is polished and functional).
2. **Chats:** 🟡 (Works via LINE, but fragmented from the web experience).
3. **Books:** 🔴 (AI summarizes, but a human must manually enter it into the Admin panel).
4. **Pays:** 🔴 (Manual PromptPay check; no digital confirmation).
5. **Gets Reminder:** 🔴 (No automated trigger exists).
6. **Comes to Shop:** ✅ (Calendar view helps admin).
7. **Promo Follow-up:** 🟡 (AI can plan it, but can't send it to specific customers).

**Missing Steps:**
- **Confirmation Loop:** The system doesn't automatically notify the customer when the admin confirms the booking.
- **Payment Verification:** No "Upload slip" $\rightarrow$ "AI verify" $\rightarrow$ "Confirm booking" flow.

---

## 5) Production Readiness Score

# Score: 4 / 10

**Brutally Honest Explanation:**
The project is a "Beautiful Prototype". The frontend is excellent, and the database schema is professional and complete. However, the **AI Agent is not actually an agent**—it's a set of prompt files and a Python script that calls a CLI tool. For a real business, the "automation" is currently an illusion; a human is still doing 90% of the work (manual data entry, manual reminders). The hardcoded secrets in the bot script make it a liability for immediate deployment.

---

## 6) Roadmap to Production

### Phase 1: MVP Launch (The "Reliable" Stage)
- [ ] **Security Fix:** Move all secrets (`LINE_TOKEN`, `GEMINI_KEY`) to `.env` files.
- [ ] **Auth Implementation:** Protect `/admin` routes with Supabase Auth.
- [ ] **Manual Booking Flow:** Ensure the Admin panel is fully tested for manual entry.
- [ ] **Payment Integration:** Add a simple "Upload Slip" feature to the customer side.

### Phase 2: Automation (The "AI Agent" Stage)
- [ ] **API-based AI:** Replace `subprocess` calls with direct API calls (Claude API / Gemini API).
- [ ] **Tool Integration:** Implement "Function Calling" so the AI can:
    - `get_free_slots(date)`
    - `create_booking(details)`
    - `add_customer_points(uid, points)`
- [ ] **Webhook Sync:** Connect the LINE Bot directly to the Supabase DB.

### Phase 3: Scaling (The "Growth" Stage)
- [ ] **Auto-Reminders:** Implement a CRON job that checks for bookings tomorrow and sends LINE notifications.
- [ ] **Marketing Engine:** Automate the `weekly_content` flow to post to social media via APIs.
- [ ] **Analytics Dashboard:** Use the `transactions` table to build a revenue/growth chart for the owner.
