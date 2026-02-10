// Admin types for super-admin authentication

export interface Admin {
  id: string
  email: string
  password_hash: string // bcrypt hashed password
  name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
