import ky from "ky";
import type { PublicCalculatorRequest, PublicCalculatorResponse } from "./types";

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

const publicApi = ky.create({ prefix: apiBaseUrl, timeout: 30000 });

export async function calculatePublic(
  body: PublicCalculatorRequest,
): Promise<PublicCalculatorResponse> {
  return publicApi
    .post("/api/public/calculator", { json: body })
    .json<PublicCalculatorResponse>();
}
