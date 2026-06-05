import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Car,
  Coins,
  Fuel,
  Leaf,
  Link2,
  Pencil,
  Scroll,
  Ticket,
  Unlink,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageBackLink, PageLayout } from "@/components/layout/PageLayout";
import { FilterInput } from "@/components/ui/FilterInput";
import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsersRelationSelect } from "@/components/form/relation-selects";
import { KpiCard } from "@/features/sustainability/components/MetricCard";
import {
  formatEnvironmentalFinancial,
  formatKpiCo2,
  formatKpiCount,
  formatKpiFuel,
  formatKpiPaper,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import type { User } from "@/features/users/api/types";
import {
  getOrganizationSummary,
  getOrganizationUsers,
} from "../../api/requests";
import { organizationKeys } from "../../api/organization-query-keys";
import {
  OrgFormDialog,
  type OrgFormData,
} from "../../components/OrgFormDialog";
import {
  useLinkOrganizationUser,
  useUnlinkOrganizationUser,
  useUpdateOrganization,
} from "../../hooks/useOrganizationMutations";

const makeUserColumns = (onUnlink: (user: User) => void): ColumnDef<User>[] => [
  entityIdColumn<User>(),
  { accessorKey: "name", header: "NOME", enableSorting: true },
  { accessorKey: "email", header: "E-MAIL", enableSorting: true },
  { accessorKey: "role", header: "FUNÇÃO", enableSorting: true },
  {
    id: "actions",
    header: "AÇÕES",
    enableSorting: false,
    cell: ({ row }) => (
      <ActionHintPopover label="Desvincular usuário da organização">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnlink(row.original)}
          aria-label="Desvincular usuário da organização"
        >
          <Unlink className="h-3 w-3" />
        </Button>
      </ActionHintPopover>
    ),
  },
];

type OrganizationDetailPageProps = {
  orgId: number;
  orgName: string;
  orgCnpj?: string | null;
};

export const OrganizationDetailPage = ({
  orgId,
  orgName,
  orgCnpj,
}: OrganizationDetailPageProps) => {
  const [userSearch, setUserSearch] = useState("");
  const [linkUserOpen, setLinkUserOpen] = useState(false);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState<number | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: organizationKeys.summary(orgId),
    queryFn: () => getOrganizationSummary(orgId),
  });

  const { data: orgUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: organizationKeys.users(orgId),
    queryFn: () => getOrganizationUsers(orgId),
  });

  const updateMutation = useUpdateOrganization();
  const unlinkMutation = useUnlinkOrganizationUser(orgId);
  const linkMutation = useLinkOrganizationUser(orgId);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return orgUsers;
    const q = userSearch.toLowerCase();
    return orgUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [orgUsers, userSearch]);

  return (
    <PageLayout
      title={`#${orgId} · ${orgName}`}
      description={orgCnpj ? `CNPJ: ${orgCnpj}` : "Detalhes da organização."}
      back={<PageBackLink to="/organizacoes" label="Organizações" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          Editar
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard title={KPI_TITLES.vehicles} value={formatKpiCount(summary?.vehicle_count)} icon={<Car className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.people} value={formatKpiCount(summary?.driver_count)} icon={<Users className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.passages} value={formatKpiCount(summary?.transaction_count)} icon={<Ticket className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.co2Avoided} value={formatKpiCo2(summary?.co2_total_kg)} icon={<Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.fuelSaved} value={formatKpiFuel(summary?.fuel_total_liters)} icon={<Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.paperSaved} value={formatKpiPaper(summary?.paper_saved_meters)} icon={<Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.financialSavings} value={formatEnvironmentalFinancial(summary ?? {})} icon={<Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <FilterInput
            placeholder="Buscar por nome ou e-mail"
            value={userSearch}
            debounceMs={300}
            onDebouncedChange={setUserSearch}
            className="max-w-xs flex-1"
          />
          <Button size="sm" onClick={() => setLinkUserOpen(true)}>
            <Link2 className="mr-1 h-3 w-3" />
            Vincular Pessoa
          </Button>
        </div>
        <DataTable
          columns={makeUserColumns((u) => unlinkMutation.mutate(u.id))}
          data={filteredUsers}
          isLoading={usersLoading}
        />
      </section>

      <OrgFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Organização"
        initial={{ name: orgName, cnpj: orgCnpj ?? "" }}
        onSubmit={(data: OrgFormData) =>
          updateMutation.mutate(
            { id: orgId, data },
            { onSuccess: () => setEditOpen(false) },
          )
        }
      />

      <Dialog
        open={linkUserOpen}
        onOpenChange={(open) => {
          setLinkUserOpen(open);
          if (!open) setSelectedLinkUserId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Pessoa</DialogTitle>
          </DialogHeader>
          <UsersRelationSelect
            value={selectedLinkUserId}
            onValueChange={setSelectedLinkUserId}
            linkableToOrganizationId={orgId}
            placeholder="Selecione uma pessoa"
            allowEmpty={false}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkUserOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedLinkUserId == null || linkMutation.isPending}
              onClick={() => {
                if (selectedLinkUserId != null) {
                  linkMutation.mutate(selectedLinkUserId, {
                    onSuccess: () => {
                      setLinkUserOpen(false);
                      setSelectedLinkUserId(undefined);
                    },
                  });
                }
              }}
            >
              <ButtonLoadingContent loading={linkMutation.isPending}>
                Vincular
              </ButtonLoadingContent>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
