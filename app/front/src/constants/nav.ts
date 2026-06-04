import {
  BookOpen,
  Building2,
  ChartLine,
  FileText,
  FlaskConical,
  Home,
  LucideIcon,
  Landmark,
  Map,
  Settings,
  Ticket,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import type { UserRole } from "@/constants/current-user";

export type NavCategoryId =
  | "principal"
  | "frota"
  | "analise"
  | "ferramentas"
  | "atividade"
  | "administracao"
  | "recursos";

export const NAV_CATEGORY_ORDER: NavCategoryId[] = [
  "principal",
  "frota",
  "analise",
  "ferramentas",
  "atividade",
  "administracao",
  "recursos",
];

export const NAV_CATEGORY_LABELS: Record<NavCategoryId, string> = {
  principal: "Principal",
  frota: "Frota",
  analise: "Análise",
  ferramentas: "Ferramentas",
  atividade: "Atividade",
  administracao: "Administração",
  recursos: "Recursos",
};

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  roles?: UserRole[];
  category: NavCategoryId;
};

export type NavCategoryGroup = {
  id: NavCategoryId;
  label: string;
  items: NavItem[];
};

export const APP_NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: ChartLine,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "principal",
  },
  {
    to: "/frotas",
    label: "Frotas",
    icon: Building2,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/frota",
    label: "Veículos",
    icon: Truck,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/passagens-auditoria",
    label: "Passagens",
    icon: Ticket,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/motoristas",
    label: "Motoristas",
    icon: Users,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icon: FileText,
    exact: true,
    roles: ["admin", "gestor_frota"],
    category: "analise",
  },
  {
    to: "/rota",
    label: "Calcular Rota",
    icon: Map,
    exact: true,
    roles: ["admin", "gestor_frota", "motorista"],
    category: "ferramentas",
  },
  {
    to: "/simulador",
    label: "Simulador",
    icon: FlaskConical,
    exact: true,
    roles: ["admin"],
    category: "ferramentas",
  },
  {
    to: "/usuarios",
    label: "Usuários",
    icon: UserCog,
    exact: true,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/organizacoes",
    label: "Organizações",
    icon: Landmark,
    exact: true,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    exact: true,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/impacto",
    label: "Meu Impacto",
    icon: Home,
    exact: true,
    roles: ["motorista"],
    category: "principal",
  },
  {
    to: "/passagens",
    label: "Minhas Passagens",
    icon: Ticket,
    exact: true,
    roles: ["motorista"],
    category: "atividade",
  },
  {
    to: "/metodologia",
    label: "Metodologia",
    icon: BookOpen,
    exact: true,
    category: "recursos",
  },
];

export function filterNavItemsByRole(
  items: NavItem[],
  role: UserRole | undefined,
): NavItem[] {
  if (!role) return items.filter((item) => !item.roles);
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export function getNavCategoriesForRole(
  role: UserRole | undefined,
): NavCategoryGroup[] {
  const filtered = filterNavItemsByRole(APP_NAV_ITEMS, role);

  return NAV_CATEGORY_ORDER.map((id) => ({
    id,
    label: NAV_CATEGORY_LABELS[id],
    items: filtered.filter((item) => item.category === id),
  })).filter((group) => group.items.length > 0);
}
