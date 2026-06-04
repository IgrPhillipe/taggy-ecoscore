import { useEffect, useRef, useState } from "react";

export type AddressSuggestion = {
  display_name: string;
  subtitle?: string;
  // null when coords not yet resolved (Search Box suggest step)
  lat: number | null;
  lon: number | null;
  mapbox_id?: string; // used to retrieve coords if null
};

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;
const SESSION_TOKEN = crypto.randomUUID();

export async function retrieveSuggestionCoords(
  mapbox_id: string,
): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({
    access_token: TOKEN,
    session_token: SESSION_TOKEN,
  });
  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapbox_id}?${params}`,
  );
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lon, lat] = feature.geometry.coordinates as [number, number];
  return { lat, lon };
}

export function useAddressSuggestions(query: string, debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.trim().length < 3 || !TOKEN) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          access_token: TOKEN,
          session_token: SESSION_TOKEN,
          language: "pt",
          country: "BR",
          limit: "8",
          types: "poi,address,place,neighborhood,locality",
        });
        const res = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();

        type RawSuggestion = {
          name: string;
          place_formatted?: string;
          mapbox_id: string;
        };

        const items: AddressSuggestion[] = ((data.suggestions ?? []) as RawSuggestion[]).map((s) => ({
          display_name: s.name,
          subtitle: s.place_formatted,
          lat: null,
          lon: null,
          mapbox_id: s.mapbox_id,
        }));

        setSuggestions(items);
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  const clear = () => setSuggestions([]);

  return { suggestions, loading, clear };
}
