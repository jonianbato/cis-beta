"use client";

import { useRouter } from "next/navigation";
import { Eye, Plus, Route } from "lucide-react";
import {
  ActionButtons,
  ApprovalStatusBadge,
  DataTable,
  Page,
  type ActionButtonItem,
  type DataTableProps,
  type OSPBadgeProps,
  type RowAction,
} from "osp-ui-kit";
import {
  embalmingData,
  type EmbalmingRecord,
  type EmbalmingStatus,
} from "./embalming-data";

type StatusTone = NonNullable<OSPBadgeProps["type"]>;

// The kit badge has four tones, so the old palette (orange, purple, green,
// cyan, red) folds onto them.
const statusToneMap: Record<EmbalmingStatus, StatusTone> = {
  "For Creation of Ticket": "warning",
  "In Progress": "info",
  "For Verification": "success",
  "Ready For Viewing": "info",
  "For Rework": "danger",
};

const truncate = (value: string, max: number) =>
  value.length > max ? value.slice(0, max) + "..." : value;

const columns: DataTableProps<EmbalmingRecord>["columns"] = [
  { accessorKey: "id", header: "Ticket No" },
  { accessorKey: "deceasedName", header: "Deceased" },
  { accessorKey: "dateOfDeath", header: "Date of Death" },
  {
    accessorKey: "placeOfDeath",
    header: "Place of Death",
    cell: ({ getValue }) => truncate(getValue<string>(), 30),
  },
  {
    accessorKey: "assignedEmbalmer",
    header: "Embalmer",
    cell: ({ getValue }) => getValue<string | null>() ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => (
      <ApprovalStatusBadge
        status={getValue<string>()}
        statusToneMap={statusToneMap}
      />
    ),
  },
];

const actionButtonDefs: ActionButtonItem[] = [
  {
    label: "New Embalming Request",
    href: "/embalming/new",
    icon: () => <Plus size={16} />,
  },
];

export default function EmbalmingListPage() {
  const router = useRouter();

  const rowActions: RowAction<EmbalmingRecord>[] = [
    {
      id: "track",
      label: "Track Embalming",
      icon: Route,
      onClick: (row) => router.push(`/Transaction/${row.id}`),
    },
    {
      id: "view",
      label: "View Details",
      icon: Eye,
      onClick: (row) => router.push(`/embalming/${row.id}`),
    },
  ];

  return (
    <Page.Root
      title="Embalming Records"
      description="All embalming requests and service status"
      headerButton="back-mobile">
      <Page.ToolContent>
        <ActionButtons buttons={actionButtonDefs} />
      </Page.ToolContent>

      <Page.MainContent>
        <Page.Row>
          <DataTable
            columns={columns}
            data={embalmingData}
            getRowId={(row) => row.id}
            rowActions={rowActions}
            features={{
              sorting: true,
              search: true,
              pagination: true,
              filtering: false,
              columnToggle: false,
              selection: false,
              detailSidebar: false,
            }}
            labels={{
              searchPlaceholder: "Search by name, ID, embalmer, or status...",
              resultsCountLabel: (total) => `Total: ${total} records`,
            }}
            mobileConfig={{
              viewMode: "card",
              primaryField: "deceasedName",
              titleTransform: "none",
              secondaryField: "id",
              badgeField: "status",
              badgeColorMap: {
                "For Creation of Ticket": "orange",
                "In Progress": "blue",
                "For Verification": "green",
                "Ready For Viewing": "cyan",
                "For Rework": "red",
              },
              visibleFields: [
                "dateOfDeath",
                "placeOfDeath",
                "assignedEmbalmer",
                "age",
              ],
              labelMap: {
                dateOfDeath: "Date of Death",
                placeOfDeath: "Place of Death",
                assignedEmbalmer: "Embalmer",
              },
              valueFormatter: {
                placeOfDeath: (value) => truncate(String(value), 25),
                assignedEmbalmer: (value) => (value as string | null) ?? "—",
              },
            }}
          />
        </Page.Row>
      </Page.MainContent>
    </Page.Root>
  );
}
