import { Link } from "@tanstack/react-router";
import { Bell, Car, ChevronRight, HelpCircle, History } from "lucide-react";
import { EnumBadge } from "@/components/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageLayout } from "@/components/layout/PageLayout";
import { USER_ROLE_LABELS, STATUS_LABELS } from "@/lib/enum-labels";
import type { UserRole } from "@/features/auth/types";
import { useCurrentUser } from "@/features/auth";
import { useGetRawVehicles } from "@/features/users/hooks/useGetRawVehicles";
import { findVehicleForUser } from "@/features/users/lib/join-users-with-vehicles";
import { Separator } from "@/components/ui/separator";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const profileLinks: Array<{
  to: "/passagens" | "/perfil/notificacoes" | "/perfil/veiculo" | "/ajuda";
  label: string;
  description: string;
  icon: typeof History;
  roles?: UserRole[];
}> = [
  {
    to: "/passagens",
    label: "Histórico de Passagens",
    description: "Veja suas passagens e impacto acumulado",
    icon: History,
    roles: ["motorista"],
  },
  {
    to: "/perfil/notificacoes",
    label: "Configuração de Notificações",
    description: "Gerencie alertas por e-mail e push",
    icon: Bell,
  },
  {
    to: "/perfil/veiculo",
    label: "Informações do Veículo",
    description: "Detalhes do veículo vinculado à sua conta",
    icon: Car,
    roles: ["motorista"],
  },
  {
    to: "/ajuda",
    label: "Ajuda e Suporte",
    description: "FAQ e canais de contato",
    icon: HelpCircle,
  },
];

export const UserProfilePage = () => {
  const { user, isAuthenticated } = useCurrentUser();
  const { data: vehicles = [] } = useGetRawVehicles();

  if (!isAuthenticated || !user) {
    return (
      <PageLayout title="Meu Perfil">
        <p className="text-muted-foreground">
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Faça login
          </Link>{" "}
          para acessar seu perfil.
        </p>
      </PageLayout>
    );
  }

  const vehicle = findVehicleForUser(user.id, vehicles);
  const status = user.status ?? "active";
  const visibleProfileLinks = profileLinks.filter(
    (link) => !link.roles || link.roles.includes(user.role),
  );

  return (
    <PageLayout
      title="Meu Perfil"
      description="Visualize e gerencie suas informações pessoais."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="items-center text-start flex flex-row gap-4">
            <Avatar className="size-12">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{user.name}</CardTitle>
              <CardDescription className="text-xs">
                {user.email}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perfil</span>
              <EnumBadge value={user.role} labels={USER_ROLE_LABELS} />
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <EnumBadge value={status} labels={STATUS_LABELS} />
            </div>

            {user.role === "motorista" ? (
              <>
                <Separator />

                {vehicle ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID da frota</span>
                      <span>{vehicle.id_tag}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Placa</span>
                      <span>{vehicle.license_plate}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Nenhum veículo vinculado.</p>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {visibleProfileLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-4 rounded border border-neutral-300 bg-white p-4 transition-colors hover:bg-accent"
            >
              <link.icon className="size-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{link.label}</p>
                <p className="text-sm text-muted-foreground">
                  {link.description}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};
