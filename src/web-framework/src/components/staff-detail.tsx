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
  const back = (
    <Link to="/dashboard" search={{ view: "staff" }} className="kv-text-link">
      <ArrowLeft size={15} />
      Back to staff directory
    </Link>
  );
  if (!person) {
    return (
      <section className="kv-card">
        <div className="kv-empty">
          <Users size={32} />
          <h2>Staff member not found.</h2>
          <p>This record may have been removed. Choose another person from the directory.</p>
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
        asset.kind,
        asset.model,
        asset.serial,
        asset.status,
        asset.location,
        asset.purchase_date,
        asset.warranty_date,
        asset.notes,
      ]),
    ]);
    toast.success(`Exported ${assets.length} assigned devices.`);
  }
  return (
    <div className="kv-staff-detail">
      {back}
      <section className="kv-card kv-staff-profile">
        <div className="kv-staff-identity">
          <Avatar name={person.name} />
          <div>
            <span className="kv-overline">STAFF PROFILE</span>
            <h2>{person.name}</h2>
            <p>{person.job_title || "Job title not recorded"}</p>
          </div>
        </div>
        <dl className="kv-staff-fields">
          <div>
            <dt>
              <Mail size={14} />
              Work email
            </dt>
            <dd>{person.email}</dd>
          </div>
          <div>
            <dt>
              <Building2 size={14} />
              Department
            </dt>
            <dd>{person.department}</dd>
          </div>
          <div>
            <dt>
              <Users size={14} />
              Responsible services
            </dt>
            <dd>{responsibleServices.length}</dd>
          </div>
          <div>
            <dt>
              <Laptop size={14} />
              Assigned devices
            </dt>
            <dd>{assets.length}</dd>
          </div>
        </dl>
        <button className="kv-button" onClick={() => onEditStaff(person)}>
          <Pencil size={15} />
          Edit staff profile
        </button>
      </section>
      <section className="kv-card kv-inventory-card">
        <div className="kv-card-heading">
          <div>
            <h2>
              Responsible services{" "}
              <span className="kv-count-pill">{responsibleServices.length}</span>
            </h2>
            <p>
              Services {person.name} is explicitly responsible for, independent of device ownership.
            </p>
          </div>
        </div>
        {responsibleServices.length === 0 ? (
          <div className="kv-empty">
            <Users size={30} />
            <h3>No service responsibilities assigned.</h3>
            <p>Add this staff member to the responsible staff in a service's settings.</p>
            <Link to="/dashboard" search={{ view: "services" }} className="kv-button">
              Manage services
            </Link>
          </div>
        ) : (
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Host device / server</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Responsible staff</th>
                  <th>
                    <span className="kv-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {responsibleServices.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <button className="kv-asset-name" onClick={() => onEditService(service)}>
                        <strong>{service.name}</strong>
                      </button>
                    </td>
                    <td>{data.assets.find((asset) => asset.id === service.host_id)?.name}</td>
                    <td>{service.environment}</td>
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
                        aria-label={`Manage ${service.name}`}
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
              Assigned devices <span className="kv-count-pill">{assets.length}</span>
            </h2>
            <p>
              All assets currently owned by {person.name}, including company phones and servers.
            </p>
          </div>
          <button className="kv-button" onClick={exportDevices} disabled={assets.length === 0}>
            <ArrowDownToLine size={15} />
            Export devices
          </button>
        </div>
        {assets.length === 0 ? (
          <div className="kv-empty">
            <Laptop size={32} />
            <h3>No devices assigned yet.</h3>
            <p>This staff member does not currently own any assets.</p>
            <Link to="/dashboard" search={{ view: "ownership" }} className="kv-button">
              Manage ownership
            </Link>
          </div>
        ) : (
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Asset tag / serial</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Warranty expires</th>
                  <th>
                    <span className="kv-sr-only">Actions</span>
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
                            <small>{asset.model || asset.kind}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <code>{asset.tag}</code>
                        <span className="kv-staff-serial">
                          {asset.serial || "Serial not recorded"}
                        </span>
                      </td>
                      <td>{asset.kind}</td>
                      <td>
                        <Badge status={asset.status} />
                      </td>
                      <td>{asset.location}</td>
                      <td>{asset.warranty_date || "Not recorded"}</td>
                      <td>
                        <button
                          className="kv-icon-button"
                          aria-label={`Manage ${asset.name}`}
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
                Services on assigned devices{" "}
                <span className="kv-count-pill">{services.length}</span>
              </h2>
              <p>Hosting relationships only; device ownership does not imply service ownership.</p>
            </div>
          </div>
          <div className="kv-table-scroll">
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Host device</th>
                  <th>Environment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{assets.find((asset) => asset.id === service.host_id)?.name}</td>
                    <td>{service.environment}</td>
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
