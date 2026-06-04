import { api } from "@/lib/http-client";
import type { User } from "@/features/users/api/types";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return api
    .post("/api/auth/login", {
      json: {
        email: credentials.email.trim(),
        password: credentials.password,
      },
    })
    .json<LoginResponse>();
}
