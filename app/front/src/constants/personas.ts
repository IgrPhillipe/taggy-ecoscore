import type { CurrentUser } from "@/features/auth/types";

/** Personas alinhadas ao seed (app/back/scripts/seed.py) */
export const PERSONA_MOCKS: { persona: CurrentUser; label: string }[] = [
  {
    persona: {
      id: 1,
      name: "Admin Sistema",
      email: "admin@taggy.com.br",
      role: "admin",
      organization_id: null,
      status: "active",
      token: "",
    },
    label: "Administrador",
  },
  {
    persona: {
      id: 2,
      name: "Carlos Gestor",
      email: "carlos@taggy.com.br",
      role: "gestor_frota",
      organization_id: 1,
      status: "active",
      token: "",
    },
    label: "Gestor de Frota",
  },
  {
    persona: {
      id: 3,
      name: "Fernanda Gestora",
      email: "fernanda@taggy.com.br",
      role: "gestor_frota",
      organization_id: 2,
      status: "active",
      token: "",
    },
    label: "Gestor de Frota (Express)",
  },
  {
    persona: {
      id: 4,
      name: "João Motorista",
      email: "joao@taggy.com.br",
      role: "motorista",
      organization_id: 1,
      status: "active",
      token: "",
    },
    label: "Motorista (Org)",
  },
  {
    persona: {
      id: 6,
      name: "Pedro Motorista",
      email: "pedro@taggy.com.br",
      role: "motorista",
      organization_id: null,
      status: "active",
      token: "",
    },
    label: "Motorista Comum",
  },
];
