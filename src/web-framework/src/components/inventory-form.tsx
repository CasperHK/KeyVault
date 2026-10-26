import type { Asset, Inventory, Service, Staff } from "@/lib/inventory";
import { AssetDialog } from "./dialogs/AssetDialog";
import { ServiceDialog } from "./dialogs/ServiceDialog";
import { StaffDialog } from "./dialogs/StaffDialog";

export type Editor =
  | { kind: "asset"; record?: Asset; defaultKind?: Asset["kind"] }
  | { kind: "staff"; record?: Staff }
  | { kind: "service"; record?: Service };

export function InventoryForm({
  editor,
  data,
  onClose,
}: {
  editor: Editor;
  data: Inventory;
  onClose: () => void;
}) {
  switch (editor.kind) {
    case "asset":
      return (
        <AssetDialog
          record={editor.record}
          defaultKind={editor.defaultKind}
          staff={data.staff}
          onClose={onClose}
        />
      );
    case "staff":
      return <StaffDialog record={editor.record} onClose={onClose} />;
    case "service":
      return <ServiceDialog record={editor.record} data={data} onClose={onClose} />;
  }
}
