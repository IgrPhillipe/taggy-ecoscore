import type { CurrentUser } from "@/features/auth/types";

/** Senha padrão de todos os usuários criados pelo seed (app/back/scripts/seed.py). */
export const SEED_DEFAULT_PASSWORD = "senha@123";

/** Atalhos de login na página de desenvolvimento — credenciais do seed. */
export const SEED_PERSONAS: { label: string; email: string; password: string }[] = [
  { label: "Administrador", email: "admin@taggy.com.br", password: SEED_DEFAULT_PASSWORD },
  { label: "Gestor de Frota", email: "carlos@taggy.com.br", password: SEED_DEFAULT_PASSWORD },
  {
    label: "Gestor de Frota (Express)",
    email: "fernanda@taggy.com.br",
    password: SEED_DEFAULT_PASSWORD,
  },
  { label: "Motorista (Org)", email: "joao@taggy.com.br", password: SEED_DEFAULT_PASSWORD },
  {
    label: "Motorista (Express)",
    email: "ana@taggy.com.br",
    password: SEED_DEFAULT_PASSWORD,
  },
  { label: "Motorista Comum", email: "pedro@taggy.com.br", password: SEED_DEFAULT_PASSWORD },
];

/** Personas alinhadas ao seed (app/back/scripts/seed.py) — usadas no switcher dev da sidebar. */
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
  {
    persona: {
      id: 5,
      name: "Ana Motorista",
      email: "ana@taggy.com.br",
      role: "motorista",
      organization_id: 2,
      status: "active",
      token: "",
    },
    label: "Motorista (Express)",
  },
];
