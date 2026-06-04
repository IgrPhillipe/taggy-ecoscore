import { parseAsInteger } from "nuqs";
import { parseAsRouteStop } from "./lib/route-location";

export const routePageSearchParams = {
  origin: parseAsRouteStop,
  destination: parseAsRouteStop,
  route: parseAsInteger.withDefault(0),
};
