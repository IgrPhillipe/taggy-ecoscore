const ptNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatMinutes(min: number): string {
  if (min < 60) {
    return `${ptNumber.format(min)}min`;
  }
  const totalMin = Math.round(min);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export function formatDurationSeconds(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const totalMin = Math.floor(sec / 60);
  const restSec = Math.round(sec % 60);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return restSec > 0 ? `${totalMin}min ${restSec}s` : `${totalMin}min`;
}

/** Hero metric: picks min, hours or days so small totals stay readable. */
export function formatTimeSavedHero(sec: number): string {
  if (sec <= 0) return "0 min";

  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) {
    return `${totalMin} min`;
  }

  const totalHours = sec / 3600;
  if (totalHours < 24) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  const days = sec / 86400;
  if (days < 10) {
    return `${ptNumber.format(days)} ${days >= 1.05 ? "dias" : "dia"}`;
  }

  return `${Math.round(days)} dias`;
}
