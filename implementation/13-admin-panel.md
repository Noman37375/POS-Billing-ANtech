# Module 13 — Admin Panel (Super Admin)

**Status:** 🟡 55% Market-Ready  
**Files:** `app/admin/`, `lib/auth/admin-session.ts`, `lib/db/admins.ts`

---

## What Was Done

- [x] Super-admin login (separate from regular users)
- [x] Admin dashboard
- [x] User management — view all registered users (tenants)
- [x] Activate / deactivate user accounts
- [x] Admin audit logging

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | Admin session handling separated from user session | `lib/auth/admin-session.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Admin can't see user's data for debugging purposes | 🟡 MEDIUM | ❌ Pending |

---

## Missing Features (for Market — SaaS Platform Admin)

- [ ] **User subscription/plan management** — free trial, paid plan, expired
- [ ] **Usage statistics per user** — # invoices, # items, storage used
- [ ] **Trial expiry enforcement** — block login when trial ends
- [ ] **Billing management** — subscription fees collection
- [ ] **Email all users** — broadcast announcement
- [ ] **Impersonate user** — admin can log in as user for support
- [ ] **System health dashboard** — database status, error rate

---

## Checklist Before Launch

- [ ] Add subscription/plan field to users table
- [ ] Add trial expiry date and enforcement
- [ ] Test admin can activate/deactivate users
- [ ] Add usage metrics per user

---

## Pakistan SaaS Pricing Model

For Pakistani market, typical SaaS POS pricing:
- **Free Trial:** 14-30 days
- **Basic Plan:** Rs. 1,000-2,000/month (1 user, basic features)
- **Standard Plan:** Rs. 3,000-5,000/month (3 users, all features)
- **Premium:** Custom (multi-branch, API access)

Add these plans to admin panel for managing subscriptions.
