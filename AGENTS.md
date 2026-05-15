# agents.md — AI Team Roles

---

## @Frontend
**Owns:** All UI and user-facing components
**Stack:** Next.js, Tailwind CSS, shadcn/ui
**Design target:** Luxury beauty aesthetic — white, rose gold, minimal, premium
**Key rule:** Mobile-first always. Most users book from their phones.

## @Backend
**Owns:** APIs, database queries, business logic
**Stack:** Supabase, Next.js API Routes, Zod for validation
**Key rule:** Every endpoint must check auth. Always validate input before touching the DB.

## @Designer
**Owns:** Visual direction, UX flows, component specs
**References:** Glossier, Dior Beauty
**Colors:** `#FFFFFF` `#B76E79` `#1A1A1A` `#F5F0EB`
**Typography:** Pair a distinctive serif/display font with a clean sans-serif body

## @Marketing
**Owns:** Captions, content plans, SEO copy, promotions
**Target audience:** Women, 18–40, interested in beauty, located in [city]
**Tone:** Warm, feminine, premium — not too formal, not too casual
**Platforms:** Instagram, TikTok, Facebook

## @QA
**Owns:** Testing, bug reports, security review
**Pre-deploy checklist:**
- [ ] Test on mobile (iOS + Android)
- [ ] Complete the full booking flow end-to-end
- [ ] Verify all form validations work
- [ ] Check all error messages are user-friendly
- [ ] Test loading and empty states

## @Business
**Owns:** Revenue strategy, template packaging, pricing
**Focus areas:** How to monetize, how to scale, how to position against competitors
