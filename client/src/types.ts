export type Role = 'tech' | 'specialist' | 'deputy_manager' | 'manager' | 'director' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  created_at?: string
}

export interface Site {
  id: number
  name: string
  loc: string | null
  type: string | null
  reg_no: string | null
  inspect_expiry: string | null
  created_at?: string
}

export interface Device {
  id: number
  name: string
  type: string | null
  status: string
  site_id: number | null
  assigned_to: number | null
  reg_no: string | null
  inspect_expiry: string | null
  description: string | null
  created_at?: string
  // enrich
  site_name?: string | null
  site_loc?: string | null
  site_type?: string | null
  assigned_name?: string | null
  assigned_email?: string | null
  has_open_ticket?: boolean
  open_ticket_count?: number
}

export interface Assignee { id: number; name: string; role: Role }

export interface TicketUpdate {
  id: number
  ticket_id: number
  user_id: number
  note: string
  created_at: string
  user_name?: string
}

export interface Ticket {
  id: number
  device_id: number | null
  site_id: number | null
  user_id: number
  status: 'pending' | 'in_progress' | 'resolved'
  description: string
  plan: string | null
  due_date: string | null
  other_label: string | null
  approved_plan: string | null
  approved_by: number | null
  approved_date: string | null
  resolved_date: string | null
  resolve_note: string | null
  incident_time: string | null
  operating_hours: number | null
  operator: string | null
  initial_cause: string | null
  created_at: string
  // enrich
  device_name?: string | null
  device_type?: string | null
  site_name?: string | null
  creator_name?: string | null
  approved_by_name?: string | null
  assignees?: Assignee[]
  updates?: TicketUpdate[]
}

export interface Report {
  id: number
  user_id: number
  month: string
  summary: string | null
  self_rate: string | null
  mgr_comment: string | null
  submitted_at: string
  user_name?: string
  user_role?: Role
}

export interface ReportStat {
  user: User
  stats: { assigned: number; resolved: number; open: number }
  report: Report | null
}
