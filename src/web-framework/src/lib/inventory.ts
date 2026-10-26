import axios from "axios";
import { api } from "./api";
import { t } from "./i18n";

export interface Staff {
  id: number;
  name: string;
  email: string;
  department: string;
  job_title: string;
}

export interface Asset {
  id: number;
  name: string;
  tag: string;
  kind: "Laptop" | "Desktop" | "Server" | "Mobile" | "Network";
  model: string;
  serial: string;
  status: "In use" | "Available" | "Maintenance" | "Retired";
  location: string;
  owner_id: number | null;
  purchase_date: string;
  warranty_date: string;
  notes: string;
  created_at: string;
}

export interface Service {
  responsible_staff: Staff[];
  id: number;
  name: string;
  description: string;
  host_id: number;
  environment: "Production" | "Staging" | "Development";
  status: "Running" | "Maintenance" | "Stopped";
  port: number;
  installation_path: string;
  health_url: string;
  health_status: "" | "Healthy" | "Unhealthy" | "Unknown";
  checked_at: string | null;
  http_status: number;
  response_time_ms: number;
  check_error: string;
}

export function serviceHealth(service: Service, now = Date.now()): string {
  if (!service.checked_at) return "Unknown";
  const age = now - new Date(service.checked_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= 5 * 60_000) return "Unknown";
  return service.health_status || "Unknown";
}

export interface InventoryEvent {
  id: number;
  category: string;
  message: string;
  actor: string;
  created_at: string;
}

export interface Inventory {
  assets: Asset[];
  staff: Staff[];
  services: Service[];
  events: InventoryEvent[];
}

export async function getInventory(): Promise<Inventory> {
  return (await api.get<{ data: Inventory }>("/api/inventory")).data.data;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    if (error.response?.status === 401 && !error.response.data?.error?.message) {
      return t("Your session has expired. Please sign in again.");
    }
    return t(
      error.response?.data?.error?.message ||
        "Unable to connect. Check that the Go API is running and try again."
    );
  }
  return t(error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const content = rows
    .map((row, index) =>
      row
        .map((value) => {
          let text = index === 0 ? t(String(value)) : String(value);
          if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
