const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

type MapboxReverseFeature = {
  properties?: {
    name?: string;
    place_formatted?: string;
    full_address?: string;
  };
};

export async function reverseGeocodeLabel(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!TOKEN) return null;

  const params = new URLSearchParams({
    access_token: TOKEN,
    longitude: String(lng),
    latitude: String(lat),
    language: "pt",
    limit: "1",
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?${params}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: MapboxReverseFeature[] };
    const feature = data.features?.[0];
    if (!feature?.properties) return null;

    const { name, place_formatted, full_address } = feature.properties;
    if (full_address) return full_address;
    if (name && place_formatted) return `${name}, ${place_formatted}`;
    return name ?? place_formatted ?? null;
  } catch {
    return null;
  }
}
