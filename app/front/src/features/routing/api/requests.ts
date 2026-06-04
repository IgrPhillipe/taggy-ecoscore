import { api } from "@/lib/http-client";
import { mockSuggestRoute, resolveWithMock } from "@/mocks";
import type { RouteSuggestRequest, RouteSuggestResponse } from "./types";

export const suggestRoute = async (
  payload: RouteSuggestRequest,
): Promise<RouteSuggestResponse> => {
  return resolveWithMock(
    async () => {
      const response = await api
        .post("/api/routes/suggest", { json: payload })
        .json<{ data: RouteSuggestResponse }>();
      return response.data;
    },
    () => mockSuggestRoute(typeof payload.destination === "string" ? payload.destination : "destino"),
  );
};
