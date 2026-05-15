# rules.md — Coding Conventions

---

## Naming

| Thing | Format | Example |
|-------|--------|---------|
| Components | PascalCase | `BookingForm.tsx` |
| Functions | camelCase | `getAvailableSlots()` |
| Variables | camelCase | `bookingDate` |
| Constants | UPPER_SNAKE_CASE | `MAX_BOOKINGS_PER_DAY` |
| Files (non-component) | kebab-case | `booking-utils.ts` |
| CSS | Tailwind only | no custom CSS unless unavoidable |

## TypeScript
- Never use `any`
- Always declare return types on functions
- Use `interface` for object shapes, `type` for unions

## Components
- One file = one primary component
- Split if file exceeds 150 lines
- All props must have a TypeScript interface above the component
- Default to Server Components — add `'use client'` only when needed

## Error Handling
- Every async function must have try/catch
- Show user-friendly error messages (not raw technical errors)
- Always log the actual error for debugging

## Git Commits
```
feat: add multi-step booking form
fix: resolve overlapping time slot bug
style: update gallery to 3-column grid
refactor: extract booking logic to lib/bookings.ts
docs: add environment variable guide to README
```
