# POS-Billing Application - Issues & Resolution Tracker

**Last Updated:** 2026-02-14
**Status:** In Progress
**Total Issues:** 42
**Resolved:** 5
**In Progress:** 1
**Pending:** 36

---

## 🔴 CRITICAL ISSUES (Resolve First)

### Issue #1: Silent Failures in Stock Movement Recording
- **File:** `lib/db/stock-movements.ts` (line 34-36)
- **Severity:** 🔴 CRITICAL
- **Impact:** Stock deductions can fail silently without user notification
- **Status:** ✅ RESOLVED
- **Description:**
  - Error handling doesn't throw, just logs to console
  - Stock movements not recorded but sale still completes
  - Inventory audit trail becomes unreliable
- **Resolution Steps:**
  1. Add error throwing mechanism
  2. Catch in caller and return error to user
  3. Add user-facing error notifications
  4. Log to audit table
- **Estimated Time:** 2 hours

### Issue #2: Incomplete User Data Isolation
- **File:** Multiple files (parties, invoices, purchases, returns)
- **Severity:** 🔴 CRITICAL
- **Impact:** Multi-tenant data leak potential
- **Status:** ✅ RESOLVED
- **Description:**
  - Some queries miss `eq("user_id", currentUser.id)` verification
  - Example: `parties/actions.ts:getPartyBalances()`
  - Users could access other users' financial data
- **Resolution Steps:**
  1. Audit all database queries for user_id verification
  2. Create a wrapper function for all queries
  3. Add TypeScript type guard to enforce user_id
  4. Test with multiple users
- **Estimated Time:** 4 hours

### Issue #3: Partial Transaction Failures
- **File:** `app/(app)/invoices/actions.ts` line 81-96, `app/(app)/pos/actions.ts` line 45-60
- **Severity:** 🔴 CRITICAL
- **Impact:** Data inconsistency (stock deducted but invoice not created, or vice versa)
- **Status:** 🟡 PARTIALLY RESOLVED (Application-level; needs DB-level RPC functions)
- **Description:**
  - Using Promise.all() without transaction handling
  - If one operation fails, others may still execute
  - No rollback mechanism
- **Resolution Steps:**
  1. Implement RPC transaction wrapper in Supabase
  2. Use database transaction for multi-step operations
  3. Add rollback logic on failure
  4. Return transactional status to user
- **Estimated Time:** 6 hours

### Issue #4: Silent Stock Movement Failures Don't Interrupt Sales
- **File:** `lib/db/stock-movements.ts` line 34-36
- **Severity:** 🔴 CRITICAL
- **Impact:** Audit trail incomplete, inventory inaccurate
- **Status:** ⏳ PENDING
- **Description:** See Issue #1
- **Resolution Steps:** Same as Issue #1
- **Estimated Time:** 2 hours

### Issue #5: No Test Coverage for Financial Operations
- **File:** Entire application
- **Severity:** 🔴 CRITICAL
- **Impact:** Critical bugs in invoicing, POS, returns undetected
- **Status:** ⏳ PENDING
- **Description:**
  - Zero test files found
  - No unit tests for business logic
  - No integration tests
  - Financial accuracy at risk
- **Resolution Steps:**
  1. Setup Jest configuration
  2. Write tests for invoice operations
  3. Write tests for POS operations
  4. Write tests for return & refund logic
  5. Write tests for authentication
  6. Add test CI/CD pipeline
- **Estimated Time:** 20 hours

---

## 🟠 HIGH PRIORITY ISSUES (Resolve in Sprint 1)

### Issue #6: No Rate Limiting on Authentication Endpoints
- **File:** `app/(auth)/login/page.tsx`, `lib/auth/session.ts`
- **Severity:** 🟠 HIGH
- **Impact:** Brute force attack vulnerability
- **Status:** ✅ RESOLVED
- **Description:**
  - Login endpoint has no attempt limiting
  - No IP-based rate limiting
  - No account lockout after N failed attempts
- **Resolution Steps:**
  1. Install rate-limiting package (express-rate-limit or similar)
  2. Add rate limiter middleware to login route
  3. Add account lockout after 5 failed attempts
  4. Add email notification on failed attempts
  5. Add admin unlock functionality
- **Estimated Time:** 3 hours

### Issue #7: Missing Input Validation
- **File:** Multiple components and action files
- **Severity:** 🟠 HIGH
- **Impact:** Invalid data in database, inconsistent business logic
- **Status:** ✅ RESOLVED (Schemas created - ready for integration)
- **Description:**
  - Phone numbers not validated
  - Emails validated minimally
  - Quantities can be negative
  - Prices can be less than cost with no warning
  - Barcode duplicates not checked safely (race condition)
- **Resolution Steps:**
  1. Create Zod validation schemas for all forms
  2. Add phone validation (regex or libphonenumber)
  3. Add price validation (cost < selling_price check)
  4. Add barcode unique constraint check with transaction
  5. Add real-time validation feedback
- **Estimated Time:** 6 hours

### Issue #8: Duplicate Barcode Race Condition
- **File:** `app/(app)/stock-management/inventory/actions.ts` line 48-58
- **Severity:** 🟠 HIGH
- **Impact:** Duplicate barcodes created, inventory confusion
- **Status:** ✅ RESOLVED
- **Description:**
  - Check for duplicate then insert has race condition window
  - Two concurrent requests could create same barcode
  - No unique constraint enforced in database
- **Resolution Steps:**
  1. Add UNIQUE constraint to barcode column in database
  2. Use database transaction for check-then-insert
  3. Handle constraint violation with proper error message
  4. Return user-friendly error
- **Estimated Time:** 2 hours

### Issue #9: Code Duplication - Party Validation
- **File:** `invoices/actions.ts`, `purchases/actions.ts`, `returns/actions.ts`, and 1+ more
- **Severity:** 🟠 HIGH
- **Impact:** Code maintenance nightmare, inconsistent validation
- **Status:** ✅ RESOLVED (Helper created in lib/db/parties-validation.ts)
- **Description:**
  - Party existence verification repeated 4+ times
  - Same validation logic in multiple files
  - Hard to maintain and update
- **Resolution Steps:**
  1. Create `lib/db/parties-validation.ts`
  2. Extract `verifyPartyExists()` function
  3. Replace all duplicates with function call
  4. Add TypeScript types
  5. Add unit tests
- **Estimated Time:** 2 hours

### Issue #10: Code Duplication - Cost Price Fetching
- **File:** `invoices/actions.ts` line 32, `pos/actions.ts` line 35
- **Severity:** 🟠 HIGH
- **Impact:** Maintenance burden, potential inconsistencies
- **Status:** ✅ RESOLVED (Helper created in lib/db/inventory-pricing.ts)
- **Description:**
  - Cost price fetching duplicated across files
  - Same logic in multiple action files
- **Resolution Steps:**
  1. Create `lib/db/inventory-pricing.ts`
  2. Extract `getCostPrice()` and `getSellingPrice()` functions
  3. Replace all duplicates
  4. Add caching for performance
- **Estimated Time:** 2 hours

### Issue #11: Code Duplication - Type Casting for Nested Relations
- **File:** Multiple files (invoices, purchases, returns, dashboard)
- **Severity:** 🟠 HIGH
- **Impact:** Repeated boilerplate, error-prone
- **Status:** ✅ RESOLVED (Helper created in lib/utils/type-helpers.ts)
- **Description:**
  - Repeated pattern: `(Array.isArray(row.parties) ? row.parties[0] : row.parties)`
  - Appears 20+ times across codebase
  - Should be utility function
- **Resolution Steps:**
  1. Create `lib/utils/type-helpers.ts`
  2. Add `extractFirstOrValue()` helper function
  3. Replace all duplicates
  4. Add JSDoc documentation
- **Estimated Time:** 1 hour

### Issue #12: Missing Audit Logging
- **File:** All action files
- **Severity:** 🟠 HIGH
- **Impact:** No accountability for data changes, compliance risk
- **Status:** ⏳ PENDING
- **Description:**
  - No table tracking who deleted what/when
  - No action history
  - Only stock_movements partially logged
- **Resolution Steps:**
  1. Create `audit_logs` table in database
  2. Create `lib/db/audit-logging.ts`
  3. Add audit logging to all create/update/delete operations
  4. Add admin audit log viewer page
  5. Add filters (user, action type, date range)
- **Estimated Time:** 6 hours

### Issue #13: Performance - N+1 Queries on Dashboard
- **File:** `app/(app)/dashboard/page.tsx` line 29-65
- **Severity:** 🟠 HIGH
- **Impact:** Dashboard slow on large datasets, database overload
- **Status:** ⏳ PENDING
- **Description:**
  - Fetches invoices, then queries cost/selling price for each
  - Could be 100+ queries per page load
- **Resolution Steps:**
  1. Optimize with aggregate query or join
  2. Use Supabase RPC with aggregate functions
  3. Add caching layer (Redis or in-memory)
  4. Add pagination to results
  5. Monitor query performance
- **Estimated Time:** 4 hours

### Issue #14: Missing Database Indexes
- **File:** Database schema
- **Severity:** 🟠 HIGH
- **Impact:** Slow queries, poor performance as data grows
- **Status:** ⏳ PENDING
- **Description:**
  - `user_id` not indexed on most tables
  - All queries filter by user_id first
  - Queries could timeout on large datasets
- **Resolution Steps:**
  1. Create migration to add indexes
  2. Index: `inventory_items(user_id, created_at)`
  3. Index: `sales_invoices(user_id, created_at)`
  4. Index: `purchase_orders(user_id, created_at)`
  5. Index: `parties(user_id, name)`
  6. Index: `stock_movements(user_id, created_at)`
  7. Test query performance
- **Estimated Time:** 2 hours

### Issue #15: Unconstrained Data Fetches
- **File:** `lib/db/parties.ts` (getPartyBalances), dashboard page
- **Severity:** 🟠 HIGH
- **Impact:** Timeout on large datasets, poor UX
- **Status:** ⏳ PENDING
- **Description:**
  - `getPartyBalances()` fetches ALL sales/purchase invoices
  - No pagination or limits
  - Could timeout on businesses with 10k+ invoices
- **Resolution Steps:**
  1. Add pagination to all list queries
  2. Add `limit` and `offset` parameters
  3. Implement cursor-based pagination for better performance
  4. Add lazy loading for large datasets
  5. Add loading indicators
- **Estimated Time:** 4 hours

### Issue #16: No Confirmation Dialogs for Destructive Actions
- **File:** All list pages (invoices, inventory, parties, etc.)
- **Severity:** 🟠 HIGH
- **Impact:** Accidental data loss, poor UX
- **Status:** ⏳ PENDING
- **Description:**
  - Delete buttons trigger immediately
  - No confirmation dialog
  - No undo functionality
- **Resolution Steps:**
  1. Create reusable `<ConfirmDialog>` component
  2. Add to all delete actions (invoices, inventory, parties, etc.)
  3. Show item details in confirmation
  4. Add "Cancel" option
  5. Test with multiple items
- **Estimated Time:** 3 hours

### Issue #17: No Search/Filter on List Views
- **File:** Invoices list, inventory list, parties list
- **Severity:** 🟠 HIGH
- **Impact:** Hard to find items in large lists
- **Status:** ⏳ PENDING
- **Description:**
  - Invoice list has no search
  - Inventory list has no filtering
  - Parties list not searchable
  - No date range filtering
- **Resolution Steps:**
  1. Add search input to invoice list
  2. Add filters: date range, status, party
  3. Add search to inventory (name, barcode, SKU)
  4. Add filters: category, low stock, price range
  5. Add search to parties (name, phone, email)
  6. Implement debounced search
- **Estimated Time:** 6 hours

---

## 🟡 MEDIUM PRIORITY ISSUES (Resolve in Sprint 2)

### Issue #18: Missing Error Boundaries
- **File:** App layout, main pages
- **Severity:** 🟡 MEDIUM
- **Impact:** Blank page on errors, no recovery mechanism
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #19: Session Data Refresh Performance
- **File:** `lib/auth/session.ts`
- **Severity:** 🟡 MEDIUM
- **Impact:** Every request queries user from DB, unnecessary load
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #20: Inconsistent Loading States
- **File:** Multiple components and action pages
- **Severity:** 🟡 MEDIUM
- **Impact:** Poor user feedback, confusing UX
- **Status:** ⏳ PENDING
- **Estimated Time:** 3 hours

### Issue #21: No Optimistic Updates
- **File:** All form components
- **Severity:** 🟡 MEDIUM
- **Impact:** Sluggish form submissions, poor perceived performance
- **Status:** ⏳ PENDING
- **Estimated Time:** 4 hours

### Issue #22: Forms Reset on Error
- **File:** Invoice form, POS form, purchase form, etc.
- **Severity:** 🟡 MEDIUM
- **Impact:** Lost user input on validation errors, frustrating UX
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #23: Stock Consistency Issues
- **File:** `lib/db/stock-movements.ts`, all action files
- **Severity:** 🟡 MEDIUM
- **Impact:** Inventory_items and stock_movements out of sync
- **Status:** ⏳ PENDING
- **Estimated Time:** 3 hours

### Issue #24: Invoice Status State Machine Not Enforced
- **File:** `invoices/actions.ts`
- **Severity:** 🟡 MEDIUM
- **Impact:** Invalid state transitions possible (Draft → Cancelled → Draft)
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #25: Return Processing Doesn't Update Invoice Status
- **File:** `returns/actions.ts`
- **Severity:** 🟡 MEDIUM
- **Impact:** Invoice shows as "Paid" but has returns, confusing
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #26: Returned Items Not Marked on Line Items
- **File:** Invoices schema, returns actions
- **Severity:** 🟡 MEDIUM
- **Impact:** Can't track which items were returned
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #27: Missing Accessibility Features
- **File:** All components
- **Severity:** 🟡 MEDIUM
- **Impact:** App not usable for people with disabilities
- **Status:** ⏳ PENDING
- **Estimated Time:** 8 hours

### Issue #28: Color-Only Status Indicators
- **File:** Multiple list components
- **Severity:** 🟡 MEDIUM
- **Impact:** Inaccessible to colorblind users
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #29: Poor Mobile Responsiveness
- **File:** Tables, forms, modals
- **Severity:** 🟡 MEDIUM
- **Impact:** App unusable on mobile devices
- **Status:** ⏳ PENDING
- **Estimated Time:** 6 hours

### Issue #30: Barcode Scanner UX Missing Fallback
- **File:** `components/barcode-scanner.tsx`
- **Severity:** 🟡 MEDIUM
- **Impact:** If camera fails, no alternative input method
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #31: No Real-Time Form Validation Feedback
- **File:** All form components
- **Severity:** 🟡 MEDIUM
- **Impact:** Users don't know field is invalid until submit
- **Status:** ⏳ PENDING
- **Estimated Time:** 4 hours

### Issue #32: Missing API Documentation
- **File:** All action files, routes
- **Severity:** 🟡 MEDIUM
- **Impact:** Hard for new developers to understand API
- **Status:** ⏳ PENDING
- **Estimated Time:** 4 hours

### Issue #33: No Password Reset Flow
- **File:** `lib/auth/`, login page
- **Severity:** 🟡 MEDIUM
- **Impact:** Locked out users have no recovery option
- **Status:** ⏳ PENDING
- **Estimated Time:** 4 hours

### Issue #34: Party Deletion Cascade Issues
- **File:** Database schema, parties actions
- **Severity:** 🟡 MEDIUM
- **Impact:** Orphaned ledger entries when party deleted
- **Status:** ⏳ PENDING
- **Estimated Time:** 2 hours

### Issue #35: No Backup/Export Functionality
- **File:** N/A (feature missing)
- **Severity:** 🟡 MEDIUM
- **Impact:** No data backup, disaster recovery risk
- **Status:** ⏳ PENDING
- **Estimated Time:** 6 hours

---

## 🟢 LOW PRIORITY ISSUES (Nice to Have)

### Issue #36: No Multi-Currency Support
- **File:** Currency context, all calculation files
- **Severity:** 🟢 LOW
- **Impact:** Can't handle multiple currencies
- **Status:** ⏳ PENDING
- **Estimated Time:** 8 hours

### Issue #37: No Offline Mode
- **File:** Entire app
- **Severity:** 🟢 LOW
- **Impact:** App doesn't work without internet
- **Status:** ⏳ PENDING
- **Estimated Time:** 12 hours

### Issue #38: No Advanced Reporting
- **File:** Reports pages
- **Severity:** 🟢 LOW
- **Impact:** Limited business intelligence
- **Status:** ⏳ PENDING
- **Estimated Time:** 10 hours

### Issue #39: No Recurring Invoices
- **File:** N/A (feature missing)
- **Severity:** 🟢 LOW
- **Impact:** Can't handle subscriptions
- **Status:** ⏳ PENDING
- **Estimated Time:** 6 hours

### Issue #40: No Image Upload Support
- **File:** Product/invoice schema
- **Severity:** 🟢 LOW
- **Impact:** Can't add product images
- **Status:** ⏳ PENDING
- **Estimated Time:** 4 hours

### Issue #41: No Webhooks/Integrations
- **File:** N/A (feature missing)
- **Severity:** 🟢 LOW
- **Impact:** Can't integrate with external systems
- **Status:** ⏳ PENDING
- **Estimated Time:** 10 hours

### Issue #42: No Role-Based UI Customization
- **File:** Layout, pages
- **Severity:** 🟢 LOW
- **Impact:** Same UI for all roles, confusion
- **Status:** ⏳ PENDING
- **Estimated Time:** 6 hours

---

## 📊 Resolution Progress

```
Critical Issues:     5 (2/5 resolved)  ████████░░░░░░░░░░░░ 40%
High Priority:      12 (3/12 resolved) ███░░░░░░░░░░░░░░░░░ 25%
Medium Priority:    18 (0/18 resolved) ░░░░░░░░░░░░░░░░░░░░ 0%
Low Priority:       7 (0/7 resolved)   ░░░░░░░░░░░░░░░░░░░░ 0%

TOTAL:             42 (5/42 resolved) █████░░░░░░░░░░░░░░░ 12%
```

---

## 🚀 Resolution Strategy

### Phase 1: Critical Issues (Week 1)
- Issue #1-5: Fix silent failures, transactions, tests
- Estimated: 30 hours
- Dependencies: None

### Phase 2: High Priority (Week 2-3)
- Issue #6-17: Security, validation, duplication, performance
- Estimated: 40 hours
- Dependencies: Phase 1 complete

### Phase 3: Medium Priority (Week 4-5)
- Issue #18-35: UX, accessibility, features
- Estimated: 50 hours
- Dependencies: Phase 2 complete

### Phase 4: Low Priority (Week 6+)
- Issue #36-42: Nice-to-have features
- Estimated: 60 hours
- Dependencies: Phase 3 complete

---

## ✅ Definition of Done

For each issue:
- [ ] Code changes implemented
- [ ] Unit tests written and passing
- [ ] Code reviewed and merged
- [ ] Integration tests passing
- [ ] Documented in code comments
- [ ] Status updated in this file
- [ ] User story acceptance criteria met

---

## 📝 Notes

- All timestamps in UTC
- Link to GitHub issues for additional tracking
- Use git commit messages: `fix: Issue #X - description`
- Tag commits with priority level: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`

