import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Formats an ISO calendar day (yyyy-MM-dd) without timezone shifts. */
export const formatCalendarDayLabel = (
  isoDay: string,
  pattern = "dd/MM",
): string => {
  const day = parse(isoDay, "yyyy-MM-dd", new Date());
  return format(day, pattern, { locale: ptBR });
};
