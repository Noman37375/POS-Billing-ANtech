<div class="joplin-table-wrapper"><table><thead><tr><th><p>MODULES</p></th><th><p>MODELS</p></th><th></th></tr><tr><th><p>Stock management</p></th><th><ul><li>Add, update,delete items.</li><li>show items list is client see.</li></ul></th><th></th></tr><tr><th><p>POS</p></th><th><ul><li>Sale items and billing systems with customers' names.</li><li>Reduces items after selling</li></ul></th><th></th></tr><tr><th><p>parties</p></th><th><ul><li>(venders/buyers) - (customers details)</li></ul><p>Customers and vendors balance</p></th><th></th></tr><tr><th><p>Employees</p></th><th><ul><li>add , delete, update all employee's details and manage salary</li></ul></th><th></th></tr><tr><th><p>accounts</p></th><th><ul><li>Summary of each bill.</li><li>Summary of total bills.</li><li>Show Profit in percentage and also in rupees.</li></ul></th><th></th></tr><tr><th><p>dash board</p></th><th><ul><li>Show total investment in stock</li><li>Show total sale in per day</li><li>Show top selling product</li></ul></th><th></th></tr><tr><th><p>Returns &amp; Refunds</p></th><th><ul><li>Sales Returns</li><li>Refund Processing</li></ul></th><th><p>Iska POS ki trha dashboard bane ga.</p></th></tr><tr><th><p>Login</p></th><th><p>Admin and different users</p></th><th></th></tr><tr><th></th><th></th><th></th></tr><tr><th></th><th></th><th></th></tr><tr><th></th><th></th><th></th></tr><tr><th></th><th></th><th></th></tr></thead></table></div>

POS SYSTEM

│

├── 1 Authentication & Authorization **( necessery )**

│ ├── Login

│ ├── Logout

│ ├── Roles

│ │ ├── Admin

│ │ ├── Manager

│ │ ├── Cashier

│ │ └── Viewer

│ └── Permissions

│

├── 2 Dashboard **( necessery )**

│ ├── Total Stock Investment

│ ├── Daily Sales

│ ├── Monthly / Yearly Sales

│ ├── Top Selling Products

│ ├── Low Stock Alerts

│ ├── Profit (Rs & %)

│ └

│

├── 3 Product & Inventory Management **( necessery )**

│ ├── Products

│ │ ├── Add Product

│ │ ├── Update Product

│ │ ├── Delete Product

│ │ ├── Product Categories

│ │ ├── Barcodes

│ │ └── Cost & Sale Price

│ │

│ ├── Stock Management **( necessery )**

│ │ ├── Stock In (Purchases)

│ │ ├── Stock Out (Sales)

│ │ ├── Stock Adjustment/ reduces items after selling

│ │ └── Stock History/ Report

│ │

│ │

│ └── Inventory Reports

│ ├── Current Stock

│ ├── Low Stock Report

│

│

├──4 POS (Sales Module) **( necessery )**

│ ├── New Sale / Counter Sale

│ │ ├── Select Customer

│ │ ├── Add Items

│ │ ├── Apply Discount

│ │ ├── Apply Tax

│ │ └── Generate Invoice

│

│

│ ├── Receipts

│ │ ├── Print Receipt

│ │

│ └── Sales History

│ ├── Daily Sales in % and Rupees

│ └── Product-wise Sales in % and Rupees

│

├── 5 Returns & Refunds **( necessery )**

│ ├── Sales Returns

│ └── Return Reports

│

├── 6 Parties Management **( necessery )**

│ ├── Customers

│ │ ├── Add / Update / Delete

│ │ ├── Purchase History

│ │ ├── Outstanding Balance

│ │

│ └── Vendors (Suppliers)

│ ├── Add / Update / Delete

│ ├── Purchase Orders

│ ├── Payables / humne usse kitni amount pay ki.

│ └── Vendor History

│

├── 7 Purchase Management **(not necessery in this time) in future we will work**

│ ├── Purchase Orders

│ ├── Goods Received (GRN)

│ ├── Supplier Invoices

│ └── Purchase Reports

│

├── 8 Employees & HR **( necessery )**

│ ├── Employees

│ │ ├── Add / Update / Delete

│ │ ├── Roles Assignment

│ │ └── Attendance

│ │

│ ├── Payroll

│ │ ├── Salary Setup

│ │ ├── Salary Calculation

│ │ └── Salary Payments

│ │

│ └── Employee Reports

│

├── 9 Accounts & Finance **( necessery ) 9 or 9.1 ek hi module mai ayyga.**

**Or dono mai se 9.1 imp hai.**

│ ├── Chart of Accounts

│ ├── Income/Revenue & Expense

│ ├── Customer Ledger

│ ├── Vendor Ledger

│ ├── Daily Cash Book

│ ├── Profit & Loss

│ └── Balance Sheet

│

├──9.1 Reports & Analytics

│ ├── Sales Reports

│ ├── Purchase Reports

│ ├── Profit Reports

│ └── Export (PDF / Excel)

│

--------------------------------------------------------------------------------------------------------

Ye hamarey kam ki cheezey hain. Ye modues client ko show nhi hongey.

├── ⚙️ Settings & Configuration

│ ├── Company Profile

│ ├── Tax Settings

│ ├── Currency Settings

│ ├── Invoice Templates

│ ├── Payment Settings

│ └── Backup & Restore

│

└── 🔍 Audit & Logs

├── Activity Logs

├── Login History

└── Data Change History

--------------------------------------------------------------------------------------------------------------------

#

#

# **POS SYSTEM - MODULE & MODEL CONNECTIONS**

## **1️⃣ Authentication / Users**

**Models**

- User
- Role
- Permission

**Connected With**

- ✅ Employees (user = employee account)  

- ✅ Sales (created_by)  

- ✅ Purchases (created_by)  

- ✅ Stock Adjustments  

User ────┐

├── Sales

├── Purchases

├── Stock Movements

## **2️⃣ Products & Inventory**

**Models**

- Product
- Category
- Stock
- StockMovement

**Connected With**

- ✅ Sales (stock OUT)  

- ✅ Purchases (stock IN)  

- ✅ Returns  

- ✅ Dashboard (investment, top products)  

- ✅ Reports  

Product

├── Stock

├── Sale Items

├── Purchase Items

└── Stock Movements

## **3️⃣ POS / Sales Module**

**Models**

- Sale
- SaleItem
- Payment
- Invoice  

**Connected With**

- ✅ Customers  

- ✅ Products  

- ✅ Accounts / Ledger  

- ✅ Stock  

- ✅ Returns  

- ✅ Dashboard  

Sale

├── SaleItem ── Product

├── Payment

├── Customer

├── User (Cashier)

└── Accounts

## **4️⃣ Parties (Customers & Vendors)**

**Models**

- Customer
- Vendor  

**Connected With**

- ✅ Sales (customers)  

- ✅ Purchases (vendors)  

- ✅ Payments  

- ✅ Accounts / Ledger  

- ✅ Reports  

Customer ── Sales ── Payments ── Ledger

Vendor ── Purchases ── Payments ── Ledger

## **5️⃣ Purchase Management**

**Models**

- Purchase
- PurchaseItem

**Connected With**

- ✅ Vendors  

- ✅ Products  

- ✅ Stock  

- ✅ Accounts  

- ✅ Reports  

Purchase

├── PurchaseItem ── Product

├── Vendor

├── Stock (IN)

└── Accounts

## **6️⃣ Stock Management (Core Engine)**

**Models**

- Stock
- StockMovement  

**Connected With**

- ✅ Sales  

- ✅ Purchases  

- ✅ Returns  

- ✅ Adjustments  

- ✅ Dashboard  

StockMovement

├── Sale

├── Purchase

├── Return

└── Adjustment

## **7️⃣ Returns & Refunds**

**Models**

- Return

**Connected With**

- ✅ Sales  

- ✅ Purchases  

- ✅ Stock  

- ✅ Accounts  

Return

├── Sale / Purchase

├── Stock (reverse)

└── Accounts

## **8️⃣ Accounts & Finance**

**Models**

- Account
- Ledgers  

**Connected With**

- ✅ Sales  

- ✅ Purchases  

- ✅ Payments  

- ✅ Customers  

- ✅ Vendors  

- ✅ Payroll  

Ledger

├── Sale

├── Purchase

├── Payment

├── Customer

└── Vendor

## **9️⃣ Employees & Payroll**

**Models**

- Employee
- Salary
- Payroll  

**Connected With**

- ✅ Users  

- ✅ Accounts  

Employee

├── User

├── Payroll

└── Accounts

## **🔟 Dashboard & Reports**

**Models (Read-Only mostly)**

- Sales
- Purchases
- Stock
- Payments
- Accounts  

**Connected With**

- ❗ Almost ALL modules (aggregation only)  

Dashboard

├── Sales

├── Purchases

├── Stock

├── Profit

└── Top Products

## **ONE COMPLETE FLOW (REAL LIFE) ( is trha working hogi)**

Customer

↓

Sale

↓

SaleItem ── Product

↓

StockMovement (OUT)

↓

Payment

↓

Ledger Entry

↓

Dashboard Update