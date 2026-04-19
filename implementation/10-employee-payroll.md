# Module 10 — Employee & Payroll

**Status:** 🟡 55% Market-Ready  
**Files:** `app/(app)/employee-management/`, `components/employee-*.tsx`, `components/payroll-*.tsx`

---

## What Was Done

- [x] Add / Edit / Delete employees
- [x] Salary structure setup (basic salary, allowances, deductions)
- [x] Payroll runs — monthly batch processing
- [x] Payroll line items per employee (gross, deductions, net)
- [x] Payroll status: Draft → Finalized → Paid
- [x] Employee ledger entries
- [x] Employee reports page

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | GP (Gross Pay) tab added to Sales — employee commission tracking | Multiple files |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Attendance tracking not implemented — salary calculated without attendance | 🟠 HIGH | ❌ Pending |
| B2 | Payroll expense not reflected in accounts/P&L | 🟡 MEDIUM | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Attendance tracking** — daily attendance, mark present/absent/leave
- [ ] **Leave management** — annual leave, sick leave balance
- [ ] **Overtime calculation** — extra hours = extra pay
- [ ] **Advance salary** — employee takes advance, deducted from next payroll
- [ ] **Payslip PDF** — give employee printed/digital payslip
- [ ] **EOBI / Social Security** — Pakistani mandatory contributions
- [ ] **Income tax deduction** — salary tax calculation (for salaried employees above threshold)
- [ ] **Employee loan tracking** — loan given, deducted monthly

---

## Pakistan-Specific: EOBI & PESSI

Pakistani employers are legally required to deduct:
- **EOBI (Employees' Old-Age Benefits Institution):** 1% of minimum wage from employee + 5% from employer
- **PESSI/SESSI:** Provincial social security (varies by province)

Add these as standard deduction fields in salary setup.

---

## Checklist Before Launch

- [ ] Add basic attendance (present/absent/late) per day
- [ ] Link attendance to salary calculation (absent days = salary deduction)
- [ ] Add advance salary feature
- [ ] Generate payslip PDF for each employee
- [ ] Verify payroll run creates expense entry in accounts
- [ ] Test finalize payroll → paid status flow

---

## Fix: Payroll → Accounts Link

When payroll is marked as "Paid":
```typescript
// Create expense entry in accounts
await createExpenseEntry({
  type: 'salary_expense',
  amount: totalNetPayroll,
  month: payrollRun.month,
  description: `Payroll for ${payrollRun.month}`,
  reference_id: payrollRun.id,
});
```

This feeds into the P&L statement as a monthly expense.
