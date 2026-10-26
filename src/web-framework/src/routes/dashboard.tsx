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
import { Avatar, assetIcons, Badge, Brand, Modal } from "@/components/keyvault-ui";
import { InventoryForm, type Editor } from "@/components/inventory-form";
import { clearAuth, logout, me } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  downloadCSV,
  errorMessage,
  getInventory,
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
  validateSearch: (search: Record<string, unknown>): { view: View } => ({
    view: views.find((view) => view === search.view) || "overview",
  }),
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
  errorComponent: ({ error, reset }) => (
    <div className="kv kv-route-error">
      <ShieldCheck size={38} />
      <h1>We couldn't open your workspace.</h1>
      <p>{errorMessage(error)}</p>
      <button className="kv-button primary" onClick={reset}>
        Try again
      </button>
      <Link to="/login" className="kv-button">
        Back to sign in
      </Link>
    </div>
  ),
  component: Dashboard,
});

function Dashboard() {
  const { view } = Route.useSearch();
  return <DashboardContent key={view} />;
}

function DashboardContent() {
  const { user } = Route.useRouteContext();
  const { view } = Route.useSearch();
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
  const [signingOut, setSigningOut] = useState(false);
  const data = inventory.data;
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleting) await api.delete(`/api/inventory/${deleting.resource}/${deleting.id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDeleting(null);
      toast.success("Record removed from your workspace.");
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
        asset.model,
        asset.serial,
        asset.location,
        person?.name || "Unassigned",
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [data, view, category, status, search]);
  const filteredStaff =
    data?.staff.filter((person) =>
      `${person.name} ${person.email} ${person.department} ${person.job_title}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];
  const filteredServices =
    data?.services.filter((service) =>
      `${service.name} ${service.description} ${service.environment} ${data.assets.find((asset) => asset.id === service.host_id)?.name}`
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
              ["Service", "Description", "Host", "Environment", "Status", "Port"],
              ...filteredServices.map((service) => [
                service.name,
                service.description,
                data.assets.find((asset) => asset.id === service.host_id)?.tag || "",
                service.environment,
                service.status,
                service.port,
              ]),
            ]
          : view === "activity"
            ? [
                ["Time", "Category", "Activity", "Actor"],
                ...filteredEvents.map((event) => [
                  event.created_at,
                  event.category,
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
                  asset.kind,
                  asset.model,
                  asset.serial,
                  asset.status,
                  owner(asset.owner_id)?.name || "Unassigned",
                  asset.location,
                  asset.purchase_date,
                  asset.warranty_date,
                  asset.notes,
                ]),
              ];
    downloadCSV(`keyvault-${view}`, rows);
    toast.success(`Exported ${rows.length - 1} records.`);
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
      <Toaster position="bottom-right" richColors />
      {mobileNav && (
        <button
          className="kv-sidebar-overlay"
          aria-label="Close navigation"
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
            <strong>Company workspace</strong>
            <small>IT inventory management</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="kv-nav-caption">WORKSPACE</span>
        <nav aria-label="Workspace navigation">
          {nav.map((item, index) => (
            <div key={item.view}>
              {index === 4 && (
                <span className="kv-nav-caption kv-nav-gap">PEOPLE & CONNECTIONS</span>
              )}
              <Link
                to="/dashboard"
                search={{ view: item.view }}
                className={`kv-nav-item ${view === item.view ? "active" : ""}`}
              >
                <item.icon size={18} />
                <span>{viewDetails[item.view].label}</span>
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
            Activity log
          </Link>
          <button className="kv-nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Help & getting started
            <ArrowUpRight size={14} />
          </button>
          <div className="kv-sidebar-tip">
            <span>
              <Sparkles size={16} /> A little tip
            </span>
            <p>A clear owner makes every device a little easier to manage.</p>
            <Link to="/dashboard" search={{ view: "ownership" }}>
              Connect your inventory <ArrowRight size={14} />
            </Link>
          </div>
          <div className="kv-profile">
            <Avatar name={`${user.first_name} ${user.last_name}`} />
            <span>
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              <small>{user.role === "ADMIN" ? "Workspace admin" : "Inventory editor"}</small>
            </span>
            <button
              className="kv-icon-button"
              onClick={signOut}
              disabled={signingOut}
              aria-label="Sign out"
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
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span className="kv-breadcrumb-icon">
              <LayoutDashboard size={17} />
            </span>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{viewDetails[view].label}</strong>
          </div>
          <div>
            <span className="kv-topbar-secure">
              <span className="kv-live-dot" /> Private workspace
            </span>
            <button
              className="kv-icon-button kv-notification-button"
              onClick={() => setNotifications(true)}
              aria-label={`Notifications: ${attentionCount} assets need attention`}
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
                ? `YOUR WORKSPACE, AT A GLANCE`
                : `WORKSPACE / ${viewDetails[view].label.toUpperCase()}`}
            </span>
            <span className="kv-today">
              <Clock3 size={14} />
              {new Intl.DateTimeFormat("en", {
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
                  Welcome back, {user.first_name} <span className="kv-wave">*</span>
                </span>
              )}
              <h1>{viewDetails[view].title}</h1>
              <p>{viewDetails[view].subtitle}</p>
            </div>
            <div className="kv-heading-actions">
              <button className="kv-button" onClick={exportData} disabled={!data}>
                <ArrowDownToLine size={16} /> Export
              </button>
              {view !== "activity" && (
                <button className="kv-button primary" onClick={openAdd} disabled={!data}>
                  <Plus size={17} />
                  {view === "staff"
                    ? "Add staff"
                    : view === "services"
                      ? "Add service"
                      : view === "servers"
                        ? "Add server"
                        : view === "mobile"
                          ? "Add phone"
                          : "Add asset"}
                </button>
              )}
            </div>
          </div>
          {inventory.isPending ? (
            <div className="kv-loading">
              <Loader2 size={30} className="kv-spin" />
              <h3>Getting everything in order...</h3>
              <p>Loading your workspace inventory.</p>
            </div>
          ) : inventory.isError ? (
            <div className="kv-empty">
              <Cloud size={36} />
              <h3>We couldn't load your inventory.</h3>
              <p>{errorMessage(inventory.error)}</p>
              <button className="kv-button primary" onClick={() => inventory.refetch()}>
                Try again
              </button>
              <Link to="/login" className="kv-text-link">
                Sign in again <ArrowRight size={14} />
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
                          label: "Total assets",
                          value: data.assets.length,
                          icon: Boxes,
                          color: "violet",
                          caption: "Every device, accounted for",
                          target: "devices",
                        },
                        {
                          label: "Assigned assets",
                          value: data.assets.filter((asset) => asset.owner_id !== null).length,
                          icon: Handshake,
                          color: "blue",
                          caption: "Connected to your people",
                          target: "ownership",
                        },
                        {
                          label: "Available to use",
                          value: data.assets.filter((asset) => asset.status === "Available").length,
                          icon: Check,
                          color: "green",
                          caption: "Ready for their next chapter",
                          target: "devices",
                        },
                        {
                          label: "Hosted services",
                          value: data.services.length,
                          icon: Cloud,
                          color: "amber",
                          caption: `Across ${new Set(data.services.map((service) => service.host_id)).size} connected hosts`,
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
                          <strong>{stat.value.toLocaleString()}</strong>
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
                            <h2>A well-connected inventory</h2>
                            <p>A little perspective on your assets.</p>
                          </div>
                          <span className="kv-pill">By category</span>
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
                                      {kind === "Mobile" ? "Mobile phones" : `${kind}s`}
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
                            <h2>A little attention goes a long way</h2>
                            <p>Your next best steps, in one place.</p>
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
                              {maintenance.length}{" "}
                              {maintenance.length === 1 ? "asset needs" : "assets need"} a check-in
                            </strong>
                            <small>Keep your equipment at its best</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                        <button className="kv-attention-row" onClick={() => setNotifications(true)}>
                          <span className="kv-icon-tile pink">
                            <ShieldCheck size={20} />
                          </span>
                          <span>
                            <strong>
                              {expiring.length}{" "}
                              {expiring.length === 1 ? "warranty needs" : "warranties need"} a look
                            </strong>
                            <small>Expired or expiring in the next 30 days</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                        <div className="kv-attention-footer">
                          <span className="kv-live-dot" />A little care today. Fewer surprises
                          tomorrow.
                        </div>
                      </section>
                    </div>
                  </>
                )}
                <section className="kv-card kv-inventory-card">
                  <div className="kv-card-heading">
                    <div>
                      <h2>
                        {view === "overview" ? "Your inventory" : viewDetails[view].label}
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
                                    ? data.assets.filter((asset) => asset.kind === "Mobile").length
                                    : data.assets.length}
                        </span>
                      </h2>
                      <p>
                        {view === "overview"
                          ? "The tools your team does great things with."
                          : view === "ownership"
                            ? "Choose an asset to assign, reassign or release its owner."
                            : view === "activity"
                              ? "Your most recent 100 inventory events."
                              : "Keep the details current. Make every connection count."}
                      </p>
                    </div>
                    {view === "overview" && (
                      <Link to="/dashboard" search={{ view: "devices" }} className="kv-text-link">
                        View all assets
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </div>
                  <div className="kv-table-toolbar">
                    <label className="kv-search">
                      <Search size={17} />
                      <input
                        aria-label="Search inventory"
                        placeholder={
                          view === "staff"
                            ? "Search people, departments..."
                            : view === "services"
                              ? "Search services, hosts..."
                              : view === "activity"
                                ? "Search activity..."
                                : "Search assets, people, tags..."
                        }
                        value={search}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      {search && (
                        <button aria-label="Clear search" onClick={() => setQuery("")}>
                          <X size={14} />
                        </button>
                      )}
                    </label>
                    {!["staff", "services", "activity"].includes(view) && (
                      <div className="kv-table-filters">
                        <label className="kv-filter">
                          <Filter size={14} />
                          <select
                            aria-label="Filter by status"
                            value={status}
                            onChange={(event) => {
                              setStatus(event.target.value);
                              setPage(1);
                            }}
                          >
                            {["All statuses", "In use", "Available", "Maintenance", "Retired"].map(
                              (value) => (
                                <option key={value}>{value}</option>
                              )
                            )}
                          </select>
                        </label>
                        {view !== "servers" && view !== "mobile" && (
                          <label className="kv-filter">
                            <select
                              aria-label="Filter by category"
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
                                <option key={value}>{value}</option>
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
                          ? "No matches. A fresh search might help."
                          : "A little empty. Full of possibilities."}
                      </h3>
                      <p>
                        {search
                          ? "Try another name, tag, department or location."
                          : "Add your first record to start connecting your workspace."}
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
                          ? "Clear filters"
                          : "Add your first record"}
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
                                {heading || <span className="kv-sr-only">Actions</span>}
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
                                        <span className="kv-pill">{event.category}</span>
                                      </td>
                                      <td>{event.actor}</td>
                                      <td className="kv-nowrap">
                                        {new Date(event.created_at).toLocaleString()}
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
                                              <small>{asset.model || asset.kind}</small>
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
                                            <span className="kv-person">
                                              <Avatar name={person.name} small />
                                              <span>{person.name}</span>
                                            </span>
                                          ) : (
                                            <span className="kv-unassigned">
                                              <span />
                                              Unassigned
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
                                              aria-label={`Manage ${asset.name}`}
                                              onClick={() => editAsset(asset)}
                                            >
                                              <MoreHorizontal size={19} />
                                            </button>
                                            <button
                                              className="kv-icon-button kv-delete-button"
                                              aria-label={`Delete ${asset.name}`}
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
                      {total > 0 ? (
                        <>
                          Showing{" "}
                          <strong>
                            {start + 1}-{Math.min(start + pageSize, total)}
                          </strong>{" "}
                          of <strong>{total}</strong>{" "}
                          {view === "staff"
                            ? "people"
                            : view === "services"
                              ? "services"
                              : view === "activity"
                                ? "events"
                                : "assets"}
                        </>
                      ) : (
                        "No records to show"
                      )}
                    </span>
                    <div>
                      <button
                        className="kv-button small"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        <ChevronLeft size={15} />
                        Previous
                      </button>
                      <span>
                        {currentPage} / {pages}
                      </span>
                      <button
                        className="kv-button small"
                        disabled={currentPage >= pages}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        Next
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </section>
                {view === "overview" && (
                  <div className="kv-dashboard-bottom">
                    <section className="kv-card kv-recent">
                      <div className="kv-card-heading">
                        <div>
                          <h2>Little things, recently</h2>
                          <p>Your workspace in motion.</p>
                        </div>
                        <Link
                          to="/dashboard"
                          search={{ view: "activity" }}
                          className="kv-text-link"
                        >
                          All activity <ArrowUpRight size={14} />
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
                              {new Date(event.created_at).toLocaleDateString("en", {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </div>
                        ))
                      ) : (
                        <p className="kv-no-activity">Your next change starts the story.</p>
                      )}
                    </section>
                    <section className="kv-quick-card">
                      <span className="kv-quick-sparkle">
                        <Sparkles size={24} />
                      </span>
                      <span className="kv-overline">GOOD CONNECTIONS START HERE</span>
                      <h3>
                        New person.
                        <br />
                        New possibilities.
                      </h3>
                      <p>
                        Welcome a teammate to your staff directory
                        <br />
                        and give their devices a proper home.
                      </p>
                      <button className="kv-button" onClick={() => setEditor({ kind: "staff" })}>
                        Register a staff member <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                )}
              </>
            )
          )}
          <footer className="kv-dashboard-footer">
            <span>
              <span className="kv-live-dot" /> A place for everything. A little headspace for you.
            </span>
            <span>
              Made for your team <span>/</span> Powered by Grit
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
        <Modal
          title={`Remove ${deleting.name}?`}
          description="This permanently deletes the inventory record. This action cannot be undone."
          onClose={() => {
            if (!deleteMutation.isPending) setDeleting(null);
          }}
        >
          <div className="kv-delete-content">
            <p>
              Reassign any owned assets or hosted services first. Past activity will remain in the
              log.
            </p>
            {deleteMutation.isError && (
              <div className="kv-error" role="alert">
                {errorMessage(deleteMutation.error)}
              </div>
            )}
            <div className="kv-modal-actions">
              <button
                className="kv-button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleting(null)}
              >
                Keep record
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
                Remove record
              </button>
            </div>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="A little help getting organized."
          description="One workspace for your company's IT inventory."
          onClose={() => setHelp(false)}
        >
          <div className="kv-help-content">
            {[
              {
                icon: Laptop,
                title: "1. Bring in your assets",
                text: "Add laptops, desktops, servers, phones and networking equipment. Include asset tags, locations and warranty dates.",
              },
              {
                icon: Users,
                title: "2. Meet your people",
                text: "Register staff in the directory. This tracks ownership; login accounts are managed separately by an administrator.",
              },
              {
                icon: Handshake,
                title: "3. Make the connections",
                text: "Open an asset to assign its owner. Register hosted services and choose the server or device they run on.",
              },
              {
                icon: ArrowDownToLine,
                title: "4. Keep a clear picture",
                text: "Search and filter inventory, export the current view as CSV, and review ownership changes in the activity log.",
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
                Open Grit administration <ExternalLink size={15} />
              </a>
            )}
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="A little attention."
          description="Warranty reminders and devices that need a check-in."
          onClose={() => setNotifications(false)}
        >
          <div className="kv-notification-list">
            {attentionCount === 0 ? (
              <div className="kv-empty">
                <ShieldCheck size={32} />
                <h3>Everything looks good.</h3>
                <p>No maintenance or warranty reminders right now.</p>
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
                    setNotifications(false);
                    editAsset(asset);
                  }}
                >
                  <span className="kv-icon-tile amber">
                    <HardDrive size={20} />
                  </span>
                  <span>
                    <strong>{asset.name}</strong>
                    <small>
                      {asset.status === "Maintenance" ? "Needs maintenance" : ""}
                      {asset.status === "Maintenance" && expiring.includes(asset) ? " / " : ""}
                      {expiring.includes(asset)
                        ? `Warranty ${asset.warranty_date < new Date().toISOString().slice(0, 10) ? "expired" : "expires"} ${asset.warranty_date}`
                        : ""}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const chartColors = ["#8670df", "#b9a9ed", "#a7c3e7", "#edc1d2", "#d4dfc4"];
function AssetDonut({ assets }: { assets: Asset[] }) {
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
      aria-label={`${assets.length} total assets, category breakdown listed alongside`}
    >
      <div>
        <Boxes size={19} />
        <strong>{assets.length}</strong>
        <span>total assets</span>
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
  return (
    <tr>
      <td>
        <button className="kv-asset-name" onClick={onEdit}>
          <Avatar name={person.name} />
          <span>
            <strong>{person.name}</strong>
            <small>{person.email}</small>
          </span>
        </button>
      </td>
      <td>
        <span className="kv-pill">{person.department}</span>
      </td>
      <td>{person.job_title || "-"}</td>
      <td>{data.assets.filter((asset) => asset.owner_id === person.id).length} assigned</td>
      <td>
        <div className="kv-row-actions">
          <button className="kv-icon-button" onClick={onEdit} aria-label={`Manage ${person.name}`}>
            <MoreHorizontal size={19} />
          </button>
          <button
            className="kv-icon-button kv-delete-button"
            onClick={onDelete}
            aria-label={`Delete ${person.name}`}
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
  const host = data.assets.find((asset) => asset.id === service.host_id);
  return (
    <tr>
      <td>
        <button className="kv-asset-name" onClick={onEdit}>
          <span className="kv-icon-tile blue">
            <Cloud size={21} />
          </span>
          <span>
            <strong>{service.name}</strong>
            <small>{service.description || "Hosted service"}</small>
          </span>
        </button>
      </td>
      <td>
        <span className="kv-host-name">
          <Server size={15} />
          <span>
            {host?.name || "Unknown host"}
            <small>{host?.tag}</small>
          </span>
        </span>
      </td>
      <td>
        <span className="kv-pill">{service.environment}</span>
      </td>
      <td>
        <Badge status={service.status} />
      </td>
      <td>
        <code>{service.port || "-"}</code>
      </td>
      <td>
        <div className="kv-row-actions">
          <button className="kv-icon-button" onClick={onEdit} aria-label={`Manage ${service.name}`}>
            <MoreHorizontal size={19} />
          </button>
          <button
            className="kv-icon-button kv-delete-button"
            onClick={onDelete}
            aria-label={`Delete ${service.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
