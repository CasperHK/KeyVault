import { Boxes, type LucideIcon, Laptop, Monitor, Network, Server, Smartphone } from "lucide-react";
import type { Asset } from "@/lib/inventory";

export const assetIcons: Record<Asset["kind"], LucideIcon> = {
  Laptop,
  Desktop: Monitor,
  Server,
  Mobile: Smartphone,
  Network,
};

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="kv-brand">
      <span className="kv-logo">
        <Boxes size={23} strokeWidth={1.8} />
      </span>
      {!compact && (
        <>
          KeyVault<span className="kv-brand-dot">.</span>
        </>
      )}
    </span>
  );
}

export function Badge({ status }: { status: string }) {
  const tone =
    status === "In use" || status === "Running"
      ? "green"
      : status === "Available"
        ? "blue"
        : status === "Maintenance"
          ? "amber"
          : "gray";
  return (
    <span className={`kv-badge ${tone}`}>
      <span />
      {status}
    </span>
  );
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const colors = ["violet", "blue", "pink", "green", "amber"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <span className={`kv-avatar ${color} ${small ? "small" : ""}`} aria-hidden="true">
      {name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
