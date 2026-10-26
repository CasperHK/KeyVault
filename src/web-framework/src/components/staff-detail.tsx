import { t, useLocale } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowLeft,
  Building2,
  Laptop,
  Mail,
  MoreHorizontal,
  Pencil,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, type Asset, type Inventory, type Service, type Staff } from "@/lib/inventory";
import { Avatar, assetIcons, Badge } from "./keyvault-ui";

export function StaffDetail({
  person,
  data,
  onEditStaff,
  onEditAsset,
  onEditService,
}: {
  person: Staff | undefined;
  data: Inventory;
  onEditStaff: (person: Staff) => void;
  onEditAsset: (asset: Asset) => void;
  onEditService: (service: Service) => void;
}) {
  useLocale();

  const back = (
    <Link to="/dashboard" search={{ view: "staff" }} className="kv-text-link">
      <ArrowLeft size={15} />
      {t("Back to staff directory")}
    </Link>
  );
  if (!person) {
    return (
      <section className="kv-card">
        <div className="kv-empty">
          <Users size={32} />
          <h2>{t("Staff member not found.")}</h2>
          <p>{t("This record may have been removed. Choose another person from the directory.")}</p>
          {back}
        </div>
      </section>
    );
  }
  const assets = data.assets.filter((asset) => asset.owner_id === person.id);
  const profile = person;
  const services = data.services.filter((service) =>
    assets.some((asset) => asset.id === service.host_id)
  );
  const responsibleServices = data.services.filter((service) =>
    service.responsible_staff.some((staff) => staff.id === person.id)
  );
  function exportDevices() {
    downloadCSV(`keyvault-staff-${profile.id}-devices`, [
      [
        "Owner",
        "Email",
        "Asset",
        "Tag",
        "Category",
        "Model",
        "Serial",
        "Status",
        "Location",
        "Purchase date",
        "Warranty expiry",
        "Notes",
      ],
      ...assets.map((asset) => [
        profile.name,
        profile.email,
        asset.name,
        asset.tag,
        t(asset.kind),
        asset.model,
        asset.serial,
        t(asset.status),
        asset.location,
        asset.purchase_date,
        asset.warranty_date,
        asset.notes,
      ]),
    ]);
    toast.success(t("Exported {count} assigned devices.", { count: assets.length }));
  }
  return (
    <div className="kv-staff-detail">
      {back}
      <section className="kv-card kv-staff-profile">
        <div className="kv-staff-identity">
          <Avatar name={person.name} />
          <div>
            <span className="kv-overline">{t("STAFF PROFILE")}</span>
            <h2>{person.name}</h2>
            <p>{person.job_title || t("Job title not recorded")}</p>
          </div>
        </div>
        <dl className="kv-staff-fields">
          <div>
            <dt>
              <Mail size={14} />
              {t("Work email")}
            </dt>
            <dd>{person.email}</dd>
          </div>
          <div>
            <dt>
              <Building2 size={14} />
              {t("Department")}
            </dt>
            <dd>{person.department}</dd>
          </div>
          <div>
            <dt>
              <Users size={14} />
              {t("Responsible services")}
            </dt>
            <dd>{responsibleServices.length}</dd>
          </div>
          <div>
            <dt>
              <Laptop size={14} />
              {t("Assigned devices")}
            </dt>
            <dd>{assets.length}</dd>
          </div>
        </dl>
        <button className="kv-button" onClick={() => onEditStaff(person)}>
          <Pencil size={15} />
          {t("Edit staff profile")}
        </button>
      </section>
      <section className="kv-card kv-inventory-card">
        <div className="kv-card-heading">
          <div>
            <h2>
              {t("Responsible services")}{" "}
              <span className="kv-count-pill">{responsibleServices.length}</span>
            </h2>
            <p>
              {t(
                "Services {name} is explicitly responsible for, independent of device ownership.",
                { name: person.name }
              )}
            </p>
          </div>
        </div>
        {responsibleServices.length === 0 ? (
          <div className="kv-empty">
            <Users size={30} />
            <h3>{t("No service responsibilities assigned.")}</h3>
            <p>{t("Add this staff member to the responsible staff in a service's settings.")}</p>
            <Link to="/dashboard" search={{ view: "services" }} className="kv-button">
              {t("Manage services")}
            </Link>
          </div>
        ) : (
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>{t("Service")}</th>
                  <th>{t("Host device / server")}</th>
                  <th>{t("Environment")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Responsible staff")}</th>
                  <th>
                    <span className="kv-sr-only">{t("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {responsibleServices.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <Link
                        to="/dashboard"
                        search={{ view: "services", service_id: service.id }}
                        className="kv-asset-name"
                      >
                        <strong>{service.name}</strong>
                      </Link>
                    </td>
                    <td>{data.assets.find((asset) => asset.id === service.host_id)?.name}</td>
                    <td>{t(service.environment)}</td>
                    <td>
                      <Badge status={service.status} />
                    </td>
                    <td>
                      <div className="kv-responsible-links">
                        {service.responsible_staff.map((staff) => (
                          <Link
                            key={staff.id}
                            to="/dashboard"
                            search={{ view: "staff", staff_id: staff.id }}
                            className="kv-text-link"
                          >
                            {staff.name}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className="kv-icon-button"
                        aria-label={t("Manage {name}", { name: service.name })}
                        onClick={() => onEditService(service)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="kv-card kv-inventory-card">
        <div className="kv-card-heading">
          <div>
            <h2>
              {t("Assigned devices")} <span className="kv-count-pill">{assets.length}</span>
            </h2>
            <p>
              {t("All assets currently owned by {name}, including company phones and servers.", {
                name: person.name,
              })}
            </p>
          </div>
          <button className="kv-button" onClick={exportDevices} disabled={assets.length === 0}>
            <ArrowDownToLine size={15} />
            {t("Export devices")}
          </button>
        </div>
        {assets.length === 0 ? (
          <div className="kv-empty">
            <Laptop size={32} />
            <h3>{t("No devices assigned yet.")}</h3>
            <p>{t("This staff member does not currently own any assets.")}</p>
            <Link to="/dashboard" search={{ view: "ownership" }} className="kv-button">
              {t("Manage ownership")}
            </Link>
          </div>
        ) : (
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>{t("Device")}</th>
                  <th>{t("Asset tag / serial")}</th>
                  <th>{t("Category")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Location")}</th>
                  <th>{t("Warranty expires")}</th>
                  <th>
                    <span className="kv-sr-only">{t("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const Icon = assetIcons[asset.kind];
                  return (
                    <tr key={asset.id}>
                      <td>
                        <button className="kv-asset-name" onClick={() => onEditAsset(asset)}>
                          <span className={`kv-device-icon ${asset.kind.toLowerCase()}`}>
                            <Icon size={22} />
                          </span>
                          <span>
                            <strong>{asset.name}</strong>
                            <small>{asset.model || t(asset.kind)}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <code>{asset.tag}</code>
                        <span className="kv-staff-serial">
                          {asset.serial || t("Serial not recorded")}
                        </span>
                      </td>
                      <td>{t(asset.kind)}</td>
                      <td>
                        <Badge status={asset.status} />
                      </td>
                      <td>{asset.location}</td>
                      <td>{asset.warranty_date || t("Not recorded")}</td>
                      <td>
                        <button
                          className="kv-icon-button"
                          aria-label={t("Manage {name}", { name: asset.name })}
                          onClick={() => onEditAsset(asset)}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {services.length > 0 && (
        <section className="kv-card">
          <div className="kv-card-heading">
            <div>
              <h2>
                {t("Services on assigned devices")}{" "}
                <span className="kv-count-pill">{services.length}</span>
              </h2>
              <p>
                {t(
                  "Hosting relationships only; device ownership does not imply service ownership."
                )}
              </p>
            </div>
          </div>
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>{t("Service")}</th>
                  <th>{t("Host device")}</th>
                  <th>{t("Environment")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <Link
                        to="/dashboard"
                        search={{ view: "services", service_id: service.id }}
                        className="kv-text-link"
                      >
                        {service.name}
                      </Link>
                    </td>
                    <td>{assets.find((asset) => asset.id === service.host_id)?.name}</td>
                    <td>{t(service.environment)}</td>
                    <td>
                      <Badge status={service.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
