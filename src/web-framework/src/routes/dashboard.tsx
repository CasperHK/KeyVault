import { formatLocale, t, useLocale, useT } from "@/lib/i18n";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cloud,
  ExternalLink,
  Filter,
  Handshake,
  HardDrive,
  Laptop,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { BaseDialog } from "@/components/dialogs/BaseDialog";
import { Avatar, assetIcons, Badge, Brand } from "@/components/keyvault-ui";
import { InventoryForm, type Editor } from "@/components/inventory-form";
import { StaffDetail } from "@/components/staff-detail";
import { ServiceDetail } from "@/components/service-detail";
import { LanguageSelector } from "@/components/language-selector";
import { clearAuth, logout, me } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  downloadCSV,
  errorMessage,
  getInventory,
  serviceHealth,
  type Asset,
  type Inventory,
  type Service,
  type Staff,
} from "@/lib/inventory";
import "@/keyvault.css";

const views = [
  "overview",
  "devices",
  "servers",
  "mobile",
  "staff",
  "ownership",
  "services",
  "activity",
] as const;
type View = (typeof views)[number];
const viewDetails: Record<View, { label: string; title: string; subtitle: string }> = {
  overview: {
    label: "Overview",
    title: "A little clarity. A lot of control.",
    subtitle: "Here's what's happening with your IT inventory today.",
  },
  devices: {
    label: "All devices",
    title: "Your inventory, beautifully organized.",
    subtitle: "Every device, every detail. All in one place.",
  },
  servers: {
    label: "Servers",
    title: "The backbone of your business.",
    subtitle: "A clear view of your servers and everything they power.",
  },
  mobile: {
    label: "Mobile phones",
    title: "Keep your team connected.",
    subtitle: "Company phones, their people, and the details that matter.",
  },
  staff: {
    label: "Staff directory",
    title: "The people behind the devices.",
    subtitle: "Your team, their departments, and the tools they call their own.",
  },
  ownership: {
    label: "Ownership",
    title: "The right device. The right person.",
    subtitle: "Clear accountability, easier handovers, happier teams.",
  },
  services: {
    label: "Hosted services",
    title: "Know what runs where.",
    subtitle: "Your applications and infrastructure, thoughtfully connected.",
  },
  activity: {
    label: "Activity log",
    title: "A story of every little change.",
    subtitle: "Asset updates, ownership handovers and new connections.",
  },
};
const nav = [
  { view: "overview", icon: LayoutDashboard },
  { view: "devices", icon: Laptop },
  { view: "servers", icon: Server },
  { view: "mobile", icon: Smartphone },
  { view: "staff", icon: Users },
  { view: "ownership", icon: Handshake },
  { view: "services", icon: Cloud },
] as const;

export const Route = createFileRoute("/dashboard")({
  validateSearch: (
    search: Record<string, unknown>
  ): { view: View; staff_id?: number; service_id?: number } => {
    const view = views.find((view) => view === search.view) || "overview";
    if (view === "services" && search.service_id !== undefined) {
      const serviceID = Number(search.service_id);
      if (!Number.isSafeInteger(serviceID) || serviceID <= 0) {
        throw new Error(
          "Service ID must be a positive integer. Open hosted services to choose a service."
        );
      }
      return { view, service_id: serviceID };
    }
    if (view !== "staff" || search.staff_id === undefined) return { view };
    const staffID = Number(search.staff_id);
    if (!Number.isSafeInteger(staffID) || staffID <= 0) {
      throw new Error(
        "Staff ID must be a positive integer. Open the staff directory to choose a person."
      );
    }
    return { view, staff_id: staffID };
  },
  beforeLoad: async () => {
    try {
      const user = await me();
      if (!["ADMIN", "EDITOR"].includes(user.role)) throw redirect({ to: "/login" });
      return { user };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuth();
        throw redirect({ to: "/login" });
      }
      throw error;
    }
  },
  errorComponent: WorkspaceError,
  component: Dashboard,
});

function WorkspaceError({ error, reset }: { error: unknown; reset: () => void }) {
  useLocale();
  return (
    <div className="kv kv-route-error">
      <LanguageSelector />
      <ShieldCheck size={38} />
      <h1>{t("We couldn't open your workspace.")}</h1>
      <p>{errorMessage(error)}</p>
      <button className="kv-button primary" onClick={reset}>
        {t("Try again")}
      </button>
      <Link to="/login" className="kv-button">
        {t("Back to sign in")}
      </Link>
    </div>
  );
}

function Dashboard() {
  const { view, staff_id, service_id } = Route.useSearch();
  return <DashboardContent key={`${view}-${staff_id || ""}-${service_id || ""}`} />;
}

function DashboardContent() {
  const t = useT();

  const { user } = Route.useRouteContext();
  const { view, staff_id, service_id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: getInventory, staleTime: 15_000 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [category, setCategory] = useState("All categories");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<{ resource: string; id: number; name: string } | null>(
    null
  );
  const [mobileNav, setMobileNav] = useState(false);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationAsset, setNotificationAsset] = useState<Asset | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const data = inventory.data;
  const isStaffDetail = view === "staff" && staff_id !== undefined;
  const isServiceDetail = view === "services" && service_id !== undefined;
  const selectedService = isServiceDetail
    ? data?.services.find((service) => service.id === service_id)
    : undefined;
  const selectedStaff = isStaffDetail
    ? data?.staff.find((person) => person.id === staff_id)
    : undefined;
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleting) await api.delete(`/api/inventory/${deleting.resource}/${deleting.id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(t("Record removed from your workspace."));
    },
  });
  const owner = (id: number | null) => data?.staff.find((person) => person.id === id);
  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.assets || []).filter((asset) => {
      if (view === "servers" && asset.kind !== "Server") return false;
      if (view === "mobile" && asset.kind !== "Mobile") return false;
      if (category !== "All categories" && asset.kind !== category) return false;
      if (status !== "All statuses" && asset.status !== status) return false;
      const person = data?.staff.find((staff) => staff.id === asset.owner_id);
      return [
        asset.name,
        asset.tag,
        asset.kind,
        t(asset.kind),
        t(asset.status),
        asset.model,
        asset.serial,
        asset.location,
        person?.name || t("Unassigned"),
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [data, view, category, status, search, t]);
  const filteredStaff =
    data?.staff.filter((person) =>
      `${person.name} ${person.email} ${person.department} ${person.job_title}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];
  const filteredServices =
    data?.services.filter((service) =>
      `${service.name} ${service.description} ${service.environment} ${t(service.environment)} ${t(service.status)} ${service.installation_path} ${service.health_url} ${service.responsible_staff.map((person) => person.name).join(" ")} ${data.assets.find((asset) => asset.id === service.host_id)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];
  const filteredEvents =
    data?.events.filter((event) =>
      `${event.message} ${event.actor} ${event.category}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];
  const total =
    view === "staff"
      ? filteredStaff.length
      : view === "services"
        ? filteredServices.length
        : view === "activity"
          ? filteredEvents.length
          : filteredAssets.length;
  const pageSize = view === "overview" ? 5 : 8;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const assets = filteredAssets.slice(start, start + pageSize);
  const expiring =
    data?.assets.filter(
      (asset) =>
        asset.warranty_date &&
        new Date(asset.warranty_date + "T23:59:59").getTime() <= Date.now() + 30 * 86400000 &&
        asset.status !== "Retired"
    ) || [];
  const maintenance = data?.assets.filter((asset) => asset.status === "Maintenance") || [];
  const attentionCount = new Set([...expiring, ...maintenance].map((asset) => asset.id)).size;
  const openAdd = () =>
    setEditor(
      view === "staff"
        ? { kind: "staff" }
        : view === "services"
          ? { kind: "service" }
          : {
              kind: "asset",
              defaultKind: view === "servers" ? "Server" : view === "mobile" ? "Mobile" : "Laptop",
            }
    );
  function exportData() {
    if (!data) return;
    const rows: (string | number)[][] =
      view === "staff"
        ? [
            ["Name", "Email", "Department", "Job title", "Assigned assets"],
            ...filteredStaff.map((person) => [
              person.name,
              person.email,
              person.department,
              person.job_title,
              data.assets.filter((asset) => asset.owner_id === person.id).length,
            ]),
          ]
        : view === "services"
          ? [
              [
                "Service",
                "Description",
                "Host",
                "Environment",
                "Status",
                "Port",
                "Responsible staff",
                "Installation path",
                "Health URL",
                "Current HTTP health",
                "Last checked",
                "Last HTTP status",
                "Last HTTP error",
              ],
              ...filteredServices.map((service) => [
                service.name,
                service.description,
                data.assets.find((asset) => asset.id === service.host_id)?.tag || "",
                t(service.environment),
                t(service.status),
                service.port,
                service.responsible_staff.map((person) => person.name).join("; "),
                service.installation_path,
                service.health_url,
                t(serviceHealth(service)),
                service.checked_at || "",
                service.http_status,
                t(service.check_error),
              ]),
            ]
          : view === "activity"
            ? [
                ["Time", "Category", "Activity", "Actor"],
                ...filteredEvents.map((event) => [
                  event.created_at,
                  t(event.category),
                  event.message,
                  event.actor,
                ]),
              ]
            : [
                [
                  "Asset",
                  "Tag",
                  "Category",
                  "Model",
                  "Serial",
                  "Status",
                  "Owner",
                  "Location",
                  "Purchase date",
                  "Warranty expiry",
                  "Notes",
                ],
                ...filteredAssets.map((asset) => [
                  asset.name,
                  asset.tag,
                  t(asset.kind),
                  asset.model,
                  asset.serial,
                  t(asset.status),
                  owner(asset.owner_id)?.name || t("Unassigned"),
                  asset.location,
                  asset.purchase_date,
                  asset.warranty_date,
                  asset.notes,
                ]),
              ];
    downloadCSV(`keyvault-${view}`, rows);
    toast.success(t("Exported {count} records.", { count: rows.length - 1 }));
  }
  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
      queryClient.clear();
      await navigate({ to: "/login" });
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }
  const setQuery = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const editAsset = (asset: Asset) => setEditor({ kind: "asset", record: asset });
  return (
    <div className="kv kv-app">
      <Toaster position="bottom-right" richColors containerAriaLabel={t("Notifications")} />
      {mobileNav && (
        <button
          className="kv-sidebar-overlay"
          aria-label={t("Close navigation")}
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`kv-sidebar ${mobileNav ? "is-open" : ""}`}>
        <Link to="/" className="kv-sidebar-brand">
          <Brand />
        </Link>
        <button className="kv-workspace" onClick={() => setHelp(true)}>
          <span className="kv-workspace-mark">
            <Building2 size={19} />
          </span>
          <span>
            <strong>{t("Company workspace")}</strong>
            <small>{t("IT inventory management")}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="kv-nav-caption">{t("WORKSPACE")}</span>
        <nav aria-label={t("Workspace navigation")}>
          {nav.map((item, index) => (
            <div key={item.view}>
              {index === 4 && (
                <span className="kv-nav-caption kv-nav-gap">{t("PEOPLE & CONNECTIONS")}</span>
              )}
              <Link
                to="/dashboard"
                search={{ view: item.view }}
                className={`kv-nav-item ${view === item.view ? "active" : ""}`}
              >
                <item.icon size={18} />
                <span>{t(viewDetails[item.view].label)}</span>
                {item.view === "devices" && data && <small>{data.assets.length}</small>}
                {item.view === "overview" && <span className="kv-nav-active-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="kv-sidebar-lower">
          <Link
            to="/dashboard"
            search={{ view: "activity" }}
            className={`kv-nav-item ${view === "activity" ? "active" : ""}`}
          >
            <Activity size={18} />
            {t("Activity log")}
          </Link>
          <button className="kv-nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            {t("Help & getting started")}
            <ArrowUpRight size={14} />
          </button>
          <div className="kv-sidebar-tip">
            <span>
              <Sparkles size={16} /> {t("A little tip")}
            </span>
            <p>{t("A clear owner makes every device a little easier to manage.")}</p>
            <Link to="/dashboard" search={{ view: "ownership" }}>
              {t("Connect your inventory")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="kv-profile">
            <Avatar name={`${user.first_name} ${user.last_name}`} />
            <span>
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              <small>{user.role === "ADMIN" ? t("Workspace admin") : t("Inventory editor")}</small>
            </span>
            <button
              className="kv-icon-button"
              onClick={signOut}
              disabled={signingOut}
              aria-label={t("Sign out")}
            >
              {signingOut ? <Loader2 size={17} className="kv-spin" /> : <LogOut size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="kv-app-content">
        <header className="kv-topbar">
          <div>
            <button
              className="kv-icon-button kv-mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label={t("Open navigation")}
            >
              <Menu size={21} />
            </button>
            <span className="kv-breadcrumb-icon">
              <LayoutDashboard size={17} />
            </span>
            <span>{t("Workspace")}</span>
            <ChevronRight size={13} />
            <strong>{t(viewDetails[view].label)}</strong>
          </div>
          <div>
            <LanguageSelector />
            <span className="kv-topbar-secure">
              <span className="kv-live-dot" /> {t("Private workspace")}
            </span>
            <button
              className="kv-icon-button kv-notification-button"
              onClick={() => setNotifications(true)}
              aria-label={t("Notifications: {count} assets need attention", {
                count: attentionCount,
              })}
            >
              <Bell size={19} />
              {attentionCount > 0 && <i />}
            </button>
            <span className="kv-topbar-divider" />
            <Avatar name={`${user.first_name} ${user.last_name}`} small />
          </div>
        </header>
        <main className="kv-dashboard-main">
          <div className="kv-welcome-row">
            <span className="kv-overline">
              {view === "overview"
                ? t("YOUR WORKSPACE, AT A GLANCE")
                : `${t("WORKSPACE")} / ${t(viewDetails[view].label).toUpperCase()}`}
            </span>
            <span className="kv-today">
              <Clock3 size={14} />
              {new Intl.DateTimeFormat(formatLocale(), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
          <div className="kv-dashboard-heading">
            <div>
              {view === "overview" && (
                <span className="kv-hello">
                  {t("Welcome back,")} {user.first_name} <span className="kv-wave">*</span>
                </span>
              )}
              <h1>
                {isStaffDetail
                  ? selectedStaff?.name || t("Staff details")
                  : isServiceDetail
                    ? selectedService?.name || t("Service details")
                    : t(viewDetails[view].title)}
              </h1>
              <p>
                {isStaffDetail
                  ? t("Their people profile, assigned devices and service responsibilities.")
                  : isServiceDetail
                    ? t("Installation location, HTTP health and detected availability errors.")
                    : t(viewDetails[view].subtitle)}
              </p>
            </div>
            {!isStaffDetail && !isServiceDetail && (
              <div className="kv-heading-actions">
                <button className="kv-button" onClick={exportData} disabled={!data}>
                  <ArrowDownToLine size={16} /> {t("Export")}
                </button>
                {view !== "activity" && (
                  <button className="kv-button primary" onClick={openAdd} disabled={!data}>
                    <Plus size={17} />
                    {view === "staff"
                      ? t("Add staff")
                      : view === "services"
                        ? t("Add service")
                        : view === "servers"
                          ? t("Add server")
                          : view === "mobile"
                            ? t("Add phone")
                            : t("Add asset")}
                  </button>
                )}
              </div>
            )}
          </div>
          {inventory.isPending ? (
            <div className="kv-loading">
              <Loader2 size={30} className="kv-spin" />
              <h3>{t("Getting everything in order...")}</h3>
              <p>{t("Loading your workspace inventory.")}</p>
            </div>
          ) : inventory.isError ? (
            <div className="kv-empty">
              <Cloud size={36} />
              <h3>{t("We couldn't load your inventory.")}</h3>
              <p>{errorMessage(inventory.error)}</p>
              <button className="kv-button primary" onClick={() => inventory.refetch()}>
                {t("Try again")}
              </button>
              <Link to="/login" className="kv-text-link">
                {t("Sign in again")} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            data && (
              <>
                {view === "overview" && (
                  <>
                    <div className="kv-stats-grid">
                      {[
                        {
                          label: t("Total assets"),
                          value: data.assets.length,
                          icon: Boxes,
                          color: "violet",
                          caption: t("Every device, accounted for"),
                          target: "devices",
                        },
                        {
                          label: t("Assigned assets"),
                          value: data.assets.filter((asset) => asset.owner_id !== null).length,
                          icon: Handshake,
                          color: "blue",
                          caption: t("Connected to your people"),
                          target: "ownership",
                        },
                        {
                          label: t("Available to use"),
                          value: data.assets.filter((asset) => asset.status === "Available").length,
                          icon: Check,
                          color: "green",
                          caption: t("Ready for their next chapter"),
                          target: "devices",
                        },
                        {
                          label: t("Hosted services"),
                          value: data.services.length,
                          icon: Cloud,
                          color: "amber",
                          caption: t("Across {count} connected hosts", {
                            count: new Set(data.services.map((service) => service.host_id)).size,
                          }),
                          target: "services",
                        },
                      ].map((stat) => (
                        <button
                          key={stat.label}
                          className="kv-stat-card"
                          onClick={() =>
                            navigate({
                              to: "/dashboard",
                              search: {
                                view: views.find((item) => item === stat.target) || "overview",
                              },
                            })
                          }
                        >
                          <div>
                            <span>{stat.label}</span>
                            <span className={`kv-icon-tile ${stat.color}`}>
                              <stat.icon size={19} />
                            </span>
                          </div>
                          <strong>{stat.value.toLocaleString(formatLocale())}</strong>
                          <span className="kv-stat-caption">
                            {stat.color === "green" && <span className="kv-live-dot" />}
                            {stat.caption}
                            <ArrowUpRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="kv-overview-grid">
                      <section className="kv-card kv-distribution">
                        <div className="kv-card-heading">
                          <div>
                            <h2>{t("A well-connected inventory")}</h2>
                            <p>{t("A little perspective on your assets.")}</p>
                          </div>
                          <span className="kv-pill">{t("By category")}</span>
                        </div>
                        <div className="kv-distribution-content">
                          <AssetDonut assets={data.assets} />
                          <div className="kv-chart-legend">
                            {(["Laptop", "Desktop", "Server", "Mobile", "Network"] as const).map(
                              (kind, index) => {
                                const count = data.assets.filter(
                                  (asset) => asset.kind === kind
                                ).length;
                                return (
                                  <div key={kind}>
                                    <span>
                                      <i style={{ background: chartColors[index] }} />
                                      {kind === "Mobile" ? t("Mobile phones") : t(`${kind}s`)}
                                    </span>
                                    <b>
                                      {count}
                                      <small>
                                        {data.assets.length
                                          ? Math.round((count / data.assets.length) * 100)
                                          : 0}
                                        %
                                      </small>
                                    </b>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </section>
                      <section className="kv-card kv-attention">
                        <div className="kv-card-heading">
                          <div>
                            <h2>{t("A little attention goes a long way")}</h2>
                            <p>{t("Your next best steps, in one place.")}</p>
                          </div>
                          <span className="kv-attention-count">{attentionCount}</span>
                        </div>
                        <button
                          className="kv-attention-row"
                          onClick={() => {
                            setStatus("Maintenance");
                            setPage(1);
                          }}
                        >
                          <span className="kv-icon-tile amber">
                            <Settings2 size={20} />
                          </span>
                          <span>
                            <strong>
                              {t(
                                maintenance.length === 1
                                  ? "{count} asset needs a check-in"
                                  : "{count} assets need a check-in",
                                { count: maintenance.length }
                              )}
                            </strong>
                            <small>{t("Keep your equipment at its best")}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                        <button className="kv-attention-row" onClick={() => setNotifications(true)}>
                          <span className="kv-icon-tile pink">
                            <ShieldCheck size={20} />
                          </span>
                          <span>
                            <strong>
                              {t(
                                expiring.length === 1
                                  ? "{count} warranty needs a look"
                                  : "{count} warranties need a look",
                                { count: expiring.length }
                              )}
                            </strong>
                            <small>{t("Expired or expiring in the next 30 days")}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                        <div className="kv-attention-footer">
                          <span className="kv-live-dot" />
                          {t("A little care today. Fewer surprises tomorrow.")}
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {isServiceDetail ? (
                  <ServiceDetail
                    service={selectedService}
                    data={data}
                    onEdit={(service) => setEditor({ kind: "service", record: service })}
                  />
                ) : isStaffDetail ? (
                  <StaffDetail
                    person={selectedStaff}
                    data={data}
                    onEditStaff={(person) => setEditor({ kind: "staff", record: person })}
                    onEditAsset={editAsset}
                    onEditService={(service) => setEditor({ kind: "service", record: service })}
                  />
                ) : (
                  <section className="kv-card kv-inventory-card">
                    <div className="kv-card-heading">
                      <div>
                        <h2>
                          {view === "overview" ? t("Your inventory") : t(viewDetails[view].label)}
                          <span className="kv-count-pill">
                            {view === "staff"
                              ? data.staff.length
                              : view === "services"
                                ? data.services.length
                                : view === "activity"
                                  ? data.events.length
                                  : view === "servers"
                                    ? data.assets.filter((asset) => asset.kind === "Server").length
                                    : view === "mobile"
                                      ? data.assets.filter((asset) => asset.kind === "Mobile")
                                          .length
                                      : data.assets.length}
                          </span>
                        </h2>
                        <p>
                          {view === "overview"
                            ? t("The tools your team does great things with.")
                            : view === "ownership"
                              ? t("Choose an asset to assign, reassign or release its owner.")
                              : view === "activity"
                                ? t("Your most recent 100 inventory events.")
                                : t("Keep the details current. Make every connection count.")}
                        </p>
                      </div>
                      {view === "overview" && (
                        <Link to="/dashboard" search={{ view: "devices" }} className="kv-text-link">
                          {t("View all assets")}
                          <ArrowUpRight size={15} />
                        </Link>
                      )}
                    </div>
                    <div className="kv-table-toolbar">
                      <label className="kv-search">
                        <Search size={17} />
                        <input
                          aria-label={t("Search inventory")}
                          placeholder={
                            view === "staff"
                              ? t("Search people, departments...")
                              : view === "services"
                                ? t("Search services, hosts, responsible staff...")
                                : view === "activity"
                                  ? t("Search activity...")
                                  : t("Search assets, people, tags...")
                          }
                          value={search}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                        {search && (
                          <button aria-label={t("Clear search")} onClick={() => setQuery("")}>
                            <X size={14} />
                          </button>
                        )}
                      </label>
                      {!["staff", "services", "activity"].includes(view) && (
                        <div className="kv-table-filters">
                          <label className="kv-filter">
                            <Filter size={14} />
                            <select
                              aria-label={t("Filter by status")}
                              value={status}
                              onChange={(event) => {
                                setStatus(event.target.value);
                                setPage(1);
                              }}
                            >
                              {[
                                "All statuses",
                                "In use",
                                "Available",
                                "Maintenance",
                                "Retired",
                              ].map((value) => (
                                <option key={value} value={value}>
                                  {t(value)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {view !== "servers" && view !== "mobile" && (
                            <label className="kv-filter">
                              <select
                                aria-label={t("Filter by category")}
                                value={category}
                                onChange={(event) => {
                                  setCategory(event.target.value);
                                  setPage(1);
                                }}
                              >
                                {[
                                  "All categories",
                                  "Laptop",
                                  "Desktop",
                                  "Server",
                                  "Mobile",
                                  "Network",
                                ].map((value) => (
                                  <option key={value} value={value}>
                                    {t(value)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                    {total === 0 ? (
                      <div className="kv-empty">
                        <Search size={30} />
                        <h3>
                          {search || status !== "All statuses" || category !== "All categories"
                            ? t("No matches. A fresh search might help.")
                            : t("A little empty. Full of possibilities.")}
                        </h3>
                        <p>
                          {search
                            ? t("Try another name, tag, department or location.")
                            : t("Add your first record to start connecting your workspace.")}
                        </p>
                        <button
                          className="kv-button"
                          onClick={() => {
                            if (
                              search ||
                              status !== "All statuses" ||
                              category !== "All categories"
                            ) {
                              setQuery("");
                              setStatus("All statuses");
                              setCategory("All categories");
                            } else openAdd();
                          }}
                        >
                          {search || status !== "All statuses" || category !== "All categories"
                            ? t("Clear filters")
                            : t("Add your first record")}
                        </button>
                      </div>
                    ) : (
                      <div className="kv-table-scroll">
                        <table className="kv-table">
                          <thead>
                            <tr>
                              {(view === "staff"
                                ? ["Staff member", "Department", "Job title", "Assets", ""]
                                : view === "services"
                                  ? [
                                      "Service",
                                      "Host device / server",
                                      "Environment",
                                      "Status",
                                      "Port",
                                      "Responsible staff",
                                      "",
                                    ]
                                  : view === "activity"
                                    ? ["Activity", "Category", "By", "When"]
                                    : [
                                        "Asset name",
                                        "Asset tag",
                                        "Status",
                                        "Assigned to",
                                        "Location",
                                        "",
                                      ]
                              ).map((heading, index) => (
                                <th key={index}>
                                  {heading ? (
                                    t(heading)
                                  ) : (
                                    <span className="kv-sr-only">{t("Actions")}</span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {view === "staff"
                              ? filteredStaff.slice(start, start + pageSize).map((person) => (
                                  <StaffRow
                                    key={person.id}
                                    person={person}
                                    data={data}
                                    onEdit={() => setEditor({ kind: "staff", record: person })}
                                    onDelete={() => {
                                      deleteMutation.reset();
                                      setDeleting({
                                        resource: "staff",
                                        id: person.id,
                                        name: person.name,
                                      });
                                    }}
                                  />
                                ))
                              : view === "services"
                                ? filteredServices.slice(start, start + pageSize).map((service) => (
                                    <ServiceRow
                                      key={service.id}
                                      service={service}
                                      data={data}
                                      onEdit={() => setEditor({ kind: "service", record: service })}
                                      onDelete={() => {
                                        deleteMutation.reset();
                                        setDeleting({
                                          resource: "services",
                                          id: service.id,
                                          name: service.name,
                                        });
                                      }}
                                    />
                                  ))
                                : view === "activity"
                                  ? filteredEvents.slice(start, start + pageSize).map((event) => (
                                      <tr key={event.id}>
                                        <td>
                                          <strong>{event.message}</strong>
                                        </td>
                                        <td>
                                          <span className="kv-pill">{t(event.category)}</span>
                                        </td>
                                        <td>{event.actor}</td>
                                        <td className="kv-nowrap">
                                          {new Date(event.created_at).toLocaleString(
                                            formatLocale()
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  : assets.map((asset) => {
                                      const Icon = assetIcons[asset.kind];
                                      const person = owner(asset.owner_id);
                                      return (
                                        <tr key={asset.id}>
                                          <td>
                                            <button
                                              className="kv-asset-name"
                                              onClick={() => editAsset(asset)}
                                            >
                                              <span
                                                className={`kv-device-icon ${asset.kind.toLowerCase()}`}
                                              >
                                                <Icon size={22} strokeWidth={1.5} />
                                              </span>
                                              <span>
                                                <strong>{asset.name}</strong>
                                                <small>{asset.model || t(asset.kind)}</small>
                                              </span>
                                            </button>
                                          </td>
                                          <td>
                                            <code>{asset.tag}</code>
                                          </td>
                                          <td>
                                            <Badge status={asset.status} />
                                          </td>
                                          <td>
                                            {person ? (
                                              <Link
                                                to="/dashboard"
                                                search={{ view: "staff", staff_id: person.id }}
                                                className="kv-person kv-owner-link"
                                              >
                                                <Avatar name={person.name} small />
                                                <span>{person.name}</span>
                                              </Link>
                                            ) : (
                                              <span className="kv-unassigned">
                                                <span />
                                                {t("Unassigned")}
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            <span className="kv-location">
                                              <Building2 size={13} />
                                              {asset.location}
                                            </span>
                                          </td>
                                          <td>
                                            <div className="kv-row-actions">
                                              <button
                                                className="kv-icon-button"
                                                aria-label={t("Manage {name}", {
                                                  name: asset.name,
                                                })}
                                                onClick={() => editAsset(asset)}
                                              >
                                                <MoreHorizontal size={19} />
                                              </button>
                                              <button
                                                className="kv-icon-button kv-delete-button"
                                                aria-label={t("Delete {name}", {
                                                  name: asset.name,
                                                })}
                                                onClick={() => {
                                                  deleteMutation.reset();
                                                  setDeleting({
                                                    resource: "assets",
                                                    id: asset.id,
                                                    name: asset.name,
                                                  });
                                                }}
                                              >
                                                <Trash2 size={15} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="kv-table-pagination">
                      <span>
                        {total > 0
                          ? t("Showing {start}-{end} of {total} {type}", {
                              start: start + 1,
                              end: Math.min(start + pageSize, total),
                              total,
                              type: t(
                                view === "staff"
                                  ? "people"
                                  : view === "services"
                                    ? "services"
                                    : view === "activity"
                                      ? "events"
                                      : "assets"
                              ),
                            })
                          : t("No records to show")}
                      </span>
                      <div>
                        <button
                          className="kv-button small"
                          disabled={currentPage <= 1}
                          onClick={() => setPage(currentPage - 1)}
                        >
                          <ChevronLeft size={15} />
                          {t("Previous")}
                        </button>
                        <span>
                          {currentPage} / {pages}
                        </span>
                        <button
                          className="kv-button small"
                          disabled={currentPage >= pages}
                          onClick={() => setPage(currentPage + 1)}
                        >
                          {t("Next")}
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                {view === "overview" && (
                  <div className="kv-dashboard-bottom">
                    <section className="kv-card kv-recent">
                      <div className="kv-card-heading">
                        <div>
                          <h2>{t("Little things, recently")}</h2>
                          <p>{t("Your workspace in motion.")}</p>
                        </div>
                        <Link
                          to="/dashboard"
                          search={{ view: "activity" }}
                          className="kv-text-link"
                        >
                          {t("All activity")} <ArrowUpRight size={14} />
                        </Link>
                      </div>
                      {data.events.length ? (
                        data.events.slice(0, 3).map((event) => (
                          <div className="kv-recent-event" key={event.id}>
                            <span className="kv-event-icon">
                              <Activity size={15} />
                            </span>
                            <div>
                              <strong>{event.message}</strong>
                              <small>{event.actor}</small>
                            </div>
                            <time>
                              {new Date(event.created_at).toLocaleDateString(formatLocale(), {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </div>
                        ))
                      ) : (
                        <p className="kv-no-activity">{t("Your next change starts the story.")}</p>
                      )}
                    </section>
                    <section className="kv-quick-card">
                      <span className="kv-quick-sparkle">
                        <Sparkles size={24} />
                      </span>
                      <span className="kv-overline">{t("GOOD CONNECTIONS START HERE")}</span>
                      <h3>
                        {t("New person.")}
                        <br />
                        {t("New possibilities.")}
                      </h3>
                      <p>
                        {t("Welcome a teammate to your staff directory")}
                        <br />
                        {t("and give their devices a proper home.")}
                      </p>
                      <button className="kv-button" onClick={() => setEditor({ kind: "staff" })}>
                        {t("Register a staff member")} <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                )}
              </>
            )
          )}
          <footer className="kv-dashboard-footer">
            <span>
              <span className="kv-live-dot" />{" "}
              {t("A place for everything. A little headspace for you.")}
            </span>
            <span>
              {t("Made for your team")} <span>/</span> {t("Powered by Grit")}
            </span>
          </footer>
        </main>
      </div>
      {editor && data && (
        <InventoryForm
          key={`${editor.kind}-${editor.record?.id || "new"}`}
          editor={editor}
          data={data}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <BaseDialog
          title={t("Remove {name}?", { name: deleting.name })}
          description={t(
            "This permanently deletes the inventory record. This action cannot be undone."
          )}
          open={!deleteMutation.isSuccess}
          dismissible={!deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleting(null);
          }}
        >
          {(close) => (
            <div className="kv-delete-content">
              <p>
                {t(
                  "Reassign any owned assets, service responsibilities or hosted services first. Past activity will remain in the log."
                )}
              </p>
              {deleteMutation.isError && (
                <div className="kv-error" role="alert">
                  {errorMessage(deleteMutation.error)}
                </div>
              )}
              <div className="kv-modal-actions">
                <button className="kv-button" disabled={deleteMutation.isPending} onClick={close}>
                  {t("Keep record")}
                </button>
                <button
                  className="kv-button danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={16} className="kv-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {t("Remove record")}
                </button>
              </div>
            </div>
          )}
        </BaseDialog>
      )}
      {help && (
        <BaseDialog
          title={t("A little help getting organized.")}
          description={t("One workspace for your company's IT inventory.")}
          onClose={() => setHelp(false)}
        >
          <div className="kv-help-content">
            {[
              {
                icon: Laptop,
                title: t("1. Bring in your assets"),
                text: t(
                  "Add laptops, desktops, servers, phones and networking equipment. Include asset tags, locations and warranty dates."
                ),
              },
              {
                icon: Users,
                title: t("2. Meet your people"),
                text: t(
                  "Register staff in the directory. This tracks ownership; login accounts are managed separately by an administrator."
                ),
              },
              {
                icon: Handshake,
                title: t("3. Make the connections"),
                text: t(
                  "Open an asset to assign its owner. Register hosted services and choose the server or device they run on."
                ),
              },
              {
                icon: ArrowDownToLine,
                title: t("4. Keep a clear picture"),
                text: t(
                  "Search and filter inventory, export the current view as CSV, and review ownership changes in the activity log."
                ),
              },
            ].map((item) => (
              <div key={item.title}>
                <span className="kv-icon-tile violet">
                  <item.icon size={21} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            {user.role === "ADMIN" && (
              <a href="/admin/dashboard" className="kv-button">
                {t("Open Grit administration")} <ExternalLink size={15} />
              </a>
            )}
          </div>
        </BaseDialog>
      )}
      {notifications && (
        <BaseDialog
          title={t("A little attention.")}
          description={t("Warranty reminders and devices that need a check-in.")}
          open={!notificationAsset}
          onClose={() => {
            setNotifications(false);
            if (notificationAsset) {
              editAsset(notificationAsset);
              setNotificationAsset(null);
            }
          }}
        >
          <div className="kv-notification-list">
            {attentionCount === 0 ? (
              <div className="kv-empty">
                <ShieldCheck size={32} />
                <h3>{t("Everything looks good.")}</h3>
                <p>{t("No maintenance or warranty reminders right now.")}</p>
              </div>
            ) : (
              [
                ...new Map(
                  [...expiring, ...maintenance].map((asset) => [asset.id, asset])
                ).values(),
              ].map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    setNotificationAsset(asset);
                  }}
                >
                  <span className="kv-icon-tile amber">
                    <HardDrive size={20} />
                  </span>
                  <span>
                    <strong>{asset.name}</strong>
                    <small>
                      {asset.status === "Maintenance" ? t("Needs maintenance") : ""}
                      {asset.status === "Maintenance" && expiring.includes(asset) ? " / " : ""}
                      {expiring.includes(asset)
                        ? t(
                            asset.warranty_date < new Date().toISOString().slice(0, 10)
                              ? "Warranty expired {date}"
                              : "Warranty expires {date}",
                            { date: asset.warranty_date }
                          )
                        : ""}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))
            )}
          </div>
        </BaseDialog>
      )}
    </div>
  );
}

const chartColors = ["#8670df", "#b9a9ed", "#a7c3e7", "#edc1d2", "#d4dfc4"];
function AssetDonut({ assets }: { assets: Asset[] }) {
  useLocale();

  let offset = 0;
  const gradient = (["Laptop", "Desktop", "Server", "Mobile", "Network"] as const)
    .map((kind, index) => {
      const start = offset;
      offset += assets.length
        ? (assets.filter((asset) => asset.kind === kind).length / assets.length) * 100
        : 0;
      return `${chartColors[index]} ${start}% ${offset}%`;
    })
    .join(", ");
  return (
    <div
      className="kv-donut"
      style={{ background: assets.length ? `conic-gradient(${gradient})` : "#efedf5" }}
      role="img"
      aria-label={t("{count} total assets, category breakdown listed alongside", {
        count: assets.length,
      })}
    >
      <div>
        <Boxes size={19} />
        <strong>{assets.length}</strong>
        <span>{t("total assets")}</span>
      </div>
    </div>
  );
}

function StaffRow({
  person,
  data,
  onEdit,
  onDelete,
}: {
  person: Staff;
  data: Inventory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useLocale();

  return (
    <tr>
      <td>
        <Link
          to="/dashboard"
          search={{ view: "staff", staff_id: person.id }}
          className="kv-asset-name"
        >
          <Avatar name={person.name} />
          <span>
            <strong>{person.name}</strong>
            <small>{person.email}</small>
          </span>
        </Link>
      </td>
      <td>
        <span className="kv-pill">{person.department}</span>
      </td>
      <td>{person.job_title || "-"}</td>
      <td>
        <Link
          to="/dashboard"
          search={{ view: "staff", staff_id: person.id }}
          className="kv-text-link"
        >
          {data.assets.filter((asset) => asset.owner_id === person.id).length} {t("assigned")}{" "}
          <ArrowUpRight size={13} />
        </Link>
      </td>
      <td>
        <div className="kv-row-actions">
          <button
            className="kv-icon-button"
            onClick={onEdit}
            aria-label={t("Manage {name}", { name: person.name })}
          >
            <MoreHorizontal size={19} />
          </button>
          <button
            className="kv-icon-button kv-delete-button"
            onClick={onDelete}
            aria-label={t("Delete {name}", { name: person.name })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ServiceRow({
  service,
  data,
  onEdit,
  onDelete,
}: {
  service: Service;
  data: Inventory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useLocale();

  const host = data.assets.find((asset) => asset.id === service.host_id);
  return (
    <tr>
      <td>
        <Link
          to="/dashboard"
          search={{ view: "services", service_id: service.id }}
          className="kv-asset-name"
        >
          <span className="kv-icon-tile blue">
            <Cloud size={21} />
          </span>
          <span>
            <strong>{service.name}</strong>
            <small>{service.description || t("Hosted service")}</small>
          </span>
        </Link>
      </td>
      <td>
        <span className="kv-host-name">
          <Server size={15} />
          <span>
            {host?.name || t("Unknown host")}
            <small>{host?.tag}</small>
          </span>
        </span>
      </td>
      <td>
        <span className="kv-pill">{t(service.environment)}</span>
      </td>
      <td>
        <Badge status={service.status} />
      </td>
      <td>
        <code>{service.port || "-"}</code>
      </td>
      <td>
        <div className="kv-responsible-links">
          {service.responsible_staff.length ? (
            service.responsible_staff.map((person) => (
              <Link
                key={person.id}
                to="/dashboard"
                search={{ view: "staff", staff_id: person.id }}
                className="kv-text-link"
              >
                {person.name}
              </Link>
            ))
          ) : (
            <span className="kv-unassigned">{t("Unassigned")}</span>
          )}
        </div>
      </td>
      <td>
        <div className="kv-row-actions">
          <button
            className="kv-icon-button"
            onClick={onEdit}
            aria-label={t("Manage {name}", { name: service.name })}
          >
            <MoreHorizontal size={19} />
          </button>
          <button
            className="kv-icon-button kv-delete-button"
            onClick={onDelete}
            aria-label={t("Delete {name}", { name: service.name })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
