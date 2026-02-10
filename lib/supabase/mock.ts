export const mockParties = [
  { id: "p1", name: "Acme Corp", phone: "9876543210", type: "Customer", balance: 45000 },
  { id: "p2", name: "Global Enterprises", phone: "8765432109", type: "Vendor", balance: -28000 },
  { id: "p3", name: "Prime Industries", phone: "7654321098", type: "Customer", balance: 12500 },
]

export const mockInventory = [
  { id: "i1", name: "Software License", stock: 50, unit_price: 5000 },
  { id: "i2", name: "Consulting Hours", stock: 100, unit_price: 2000 },
  { id: "i3", name: "Support Package", stock: 30, unit_price: 10000 },
]

export const mockInvoices = [
  { id: "INV-001", total: 15000, status: "Paid", created_at: new Date().toISOString() },
  { id: "INV-002", total: 22440, status: "Draft", created_at: new Date().toISOString() },
]

