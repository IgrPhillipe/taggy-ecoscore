import {
  BookOpen,
  Building2,
  ChartLine,
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
    roles: ["admin", "gestor_frota"],
    category: "principal",
  },
  {
    to: "/frotas",
    label: "Frotas",
    icon: Building2,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/frota",
    label: "Veículos",
    icon: Truck,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/passagens-auditoria",
    label: "Passagens",
    icon: Ticket,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/motoristas",
    label: "Motoristas",
    icon: Users,
    roles: ["admin", "gestor_frota"],
    category: "frota",
  },
  {
    to: "/rota",
    label: "Calcular Rota",
    icon: Map,
    roles: ["admin", "gestor_frota", "motorista"],
    category: "ferramentas",
  },
  {
    to: "/simulador",
    label: "Simulador",
    icon: FlaskConical,
    roles: ["admin"],
    category: "ferramentas",
  },
  {
    to: "/usuarios",
    label: "Usuários",
    icon: UserCog,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/organizacoes",
    label: "Organizações",
    icon: Landmark,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    roles: ["admin"],
    category: "administracao",
  },
  {
    to: "/impacto",
    label: "Meu Impacto",
    icon: Home,
    roles: ["motorista"],
    category: "principal",
  },
  {
    to: "/passagens",
    label: "Minhas Passagens",
    icon: Ticket,
    roles: ["motorista"],
    category: "atividade",
  },
  {
    to: "/metodologia",
    label: "Metodologia",
    icon: BookOpen,
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
