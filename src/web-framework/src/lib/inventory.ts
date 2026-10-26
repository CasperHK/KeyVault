import axios from 'axios'
import { api } from './api'

export interface Staff {
  id: number
  name: string
  email: string
  department: string
  job_title: string
}

export interface Asset {
  id: number
  name: string
  tag: string
  kind: 'Laptop' | 'Desktop' | 'Server' | 'Mobile' | 'Network'
  model: string
  serial: string
  status: 'In use' | 'Available' | 'Maintenance' | 'Retired'
  location: string
  owner_id: number | null
  purchase_date: string
  warranty_date: string
  notes: string
  created_at: string
}

export interface Service {
  id: number
  name: string
  description: string
  host_id: number
  environment: 'Production' | 'Staging' | 'Development'
  status: 'Running' | 'Maintenance' | 'Stopped'
  port: number
}

export interface InventoryEvent {
  id: number
  category: string
  message: string
  actor: string
  created_at: string
}

export interface Inventory {
  assets: Asset[]
  staff: Staff[]
  services: Service[]
  events: InventoryEvent[]
}

export async function getInventory(): Promise<Inventory> {
  return (await api.get<{ data: Inventory }>('/api/inventory')).data.data
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    if (error.response?.status === 401) return 'Your session has expired. Please sign in again.'
    return error.response?.data.error?.message || 'Unable to connect. Check that the Go API is running and try again.'
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const content = rows.map(row => row.map(value => {
    let text = String(value)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
