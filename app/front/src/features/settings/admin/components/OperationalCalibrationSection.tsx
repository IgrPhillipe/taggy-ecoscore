import { useEffect, useMemo, useState } from "react";
import { Lock, LockOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetFuelPrices,
  useGetTaggyPlacesSummary,
  useGetTechnicalSpecs,
  useSyncEmissionFactors,
  useSyncFuelPrices,
  useSyncTaggyPlaces,
  useUpdateFuelPrice,
  useUpdateTechnicalSpecs,
} from "../../hooks/useSettings";
import type { FuelPriceByUF, TechnicalSpecs } from "../../api/requests";

type SpecField = {
  key: keyof TechnicalSpecs;
  label: string;
};

type SpecCategory = {
  title: string;
  fields: SpecField[];
};

const SPEC_CATEGORIES: SpecCategory[] = [
  {
    title: "Fatores de emissão CO₂",
    fields: [
      { key: "emission_factor_diesel_s10", label: "diesel s10 (kg co₂/l)" },
      { key: "emission_factor_gasolina_c", label: "gasolina c (kg co₂/l)" },
      { key: "emission_factor_etanol", label: "etanol (kg co₂/l)" },
      { key: "emission_factor_gnv", label: "gnv (kg co₂/m³)" },
      { key: "emission_factor_eletrico_kwh", label: "elétrico (kg co₂/kwh)" },
    ],
  },
  {
    title: "Fatores CH₄",
    fields: [
      { key: "ch4_factor_gasolina_c", label: "gasolina c (kg ch₄/l)" },
      { key: "ch4_factor_diesel_s10", label: "diesel s10 (kg ch₄/l)" },
      { key: "ch4_factor_etanol", label: "etanol (kg ch₄/l)" },
      { key: "ch4_factor_gnv", label: "gnv (kg ch₄/m³)" },
    ],
  },
  {
    title: "Fatores N₂O",
    fields: [
      { key: "n2o_factor_gasolina_c", label: "gasolina c (kg n₂o/l)" },
      { key: "n2o_factor_diesel_s10", label: "diesel s10 (kg n₂o/l)" },
      { key: "n2o_factor_etanol", label: "etanol (kg n₂o/l)" },
      { key: "n2o_factor_gnv", label: "gnv (kg n₂o/m³)" },
    ],
  },
  {
    title: "GWP100 (IPCC AR6)",
    fields: [
      { key: "gwp100_ch4", label: "ch₄" },
      { key: "gwp100_n2o", label: "n₂o" },
    ],
  },
  {
    title: "Percentuais de biocombustível",
    fields: [
      { key: "blend_etanol_pct", label: "etanol na gasolina c" },
      { key: "blend_biodiesel_pct", label: "biodiesel no diesel s10" },
    ],
  },
  {
    title: "Taxas de ociosidade",
    fields: [
      { key: "idle_rate_leve", label: "veículo leve (l/s)" },
      { key: "idle_rate_pesado", label: "veículo pesado (l/s)" },
      { key: "idle_rate_gnv", label: "gnv (m³/s)" },
      { key: "idle_rate_eletrico", label: "elétrico (kwh/s)" },
    ],
  },
  {
    title: "Impacto do ticket de papel",
    fields: [
      { key: "paper_co2_per_ticket", label: "co₂ por ticket (kg)" },
      { key: "paper_water_per_ticket", label: "água por ticket (l)" },
    ],
  },
  {
    title: "Metáforas lúdicas",
    fields: [
      { key: "ludic_tree_year_absorption", label: "absorção anual por árvore (kg co₂)" },
    ],
  },
  {
    title: "Tempos de passagem",
    fields: [
      { key: "baseline_pedagio_avg_wait_sec", label: "pedágio — sem tag (s)" },
      { key: "elapsed_pedagio_avg_sec", label: "pedágio — com tag (s)" },
      {
        key: "baseline_estacionamento_avg_wait_sec",
        label: "estacionamento — sem tag (s)",
      },
      {
        key: "elapsed_estacionamento_avg_sec",
        label: "estacionamento — com tag (s)",
      },
    ],
  },
  {
    title: "Combustível extra por parada",
    fields: [
      {
        key: "accel_surge_leve",
        label: "frenagem e aceleração — veículo leve (l)",
      },
      {
        key: "accel_surge_pesado",
        label: "frenagem e aceleração — veículo pesado (l)",
      },
    ],
  },
];

const SPEC_FIELDS: SpecField[] = SPEC_CATEGORIES.flatMap((cat) => cat.fields);

const BRASILIA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

const formatUtcAsBrasilia = (isoDate: string): string => {
  const utc = new Date(
    isoDate.endsWith("Z") || isoDate.includes("+") ? isoDate : `${isoDate}Z`,
  );
  const brasilia = new Date(utc.getTime() - BRASILIA_UTC_OFFSET_MS);
  return brasilia.toLocaleString("pt-BR", { timeZone: "UTC" });
};

export const OperationalCalibrationSection = () => {
  const { data: bundle, isLoading, isError } = useGetTechnicalSpecs();
  const { data: fuelPrices = {} } = useGetFuelPrices();
  const { mutateAsync: updateSpecsAsync, isPending: isSavingSpecs } =
    useUpdateTechnicalSpecs();
  const { mutateAsync: syncPricesAsync, isPending: isSyncing } =
    useSyncFuelPrices();
  const { mutateAsync: syncMctiAsync, isPending: isSyncingMcti } =
    useSyncEmissionFactors();
  const { mutateAsync: updateFuelPriceAsync } = useUpdateFuelPrice();
  const { data: taggyPlaces, isLoading: isLoadingTaggy } =
    useGetTaggyPlacesSummary();
  const { mutateAsync: syncTaggyAsync, isPending: isSyncingTaggy } =
    useSyncTaggyPlaces();

  const [isSavingFuelPrices, setIsSavingFuelPrices] = useState(false);

  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [unlockedSpecs, setUnlockedSpecs] = useState<Set<string>>(new Set());
  const [unlockedFuelRows, setUnlockedFuelRows] = useState<Set<string>>(
    new Set(),
  );
  const [localFuelPrices, setLocalFuelPrices] = useState<
    Record<string, FuelPriceByUF>
  >({});

  const toggleSpecLock = (key: string) => {
    setUnlockedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleFuelRowLock = (uf: string) => {
    setUnlockedFuelRows((prev) => {
      const next = new Set(prev);
      if (next.has(uf)) {
        next.delete(uf);
      } else {
        next.add(uf);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!bundle?.specs) return;
    const next: Record<string, string> = {};
    for (const field of SPEC_FIELDS) {
      const raw = bundle.specs[field.key];
      next[field.key] = raw == null ? "" : String(raw);
    }
    setSpecValues(next);
  }, [bundle]);

  useEffect(() => {
    if (Object.keys(fuelPrices).length) {
      setLocalFuelPrices(fuelPrices);
    }
  }, [fuelPrices]);

  const ufs = useMemo(
    () => Object.keys(localFuelPrices).sort(),
    [localFuelPrices],
  );

  const handleSyncPrices = () => {
    toast.promise(
      syncPricesAsync().then((result) => {
        setUnlockedFuelRows(new Set());
        return result;
      }),
      {
        loading: "Sincronizando preços com a ANP...",
        success: "Preços sincronizados com a ANP!",
        error: (err) =>
          err instanceof Error ? err.message : "Erro ao sincronizar preços.",
      },
    );
  };

  const handleSyncMcti = () => {
    toast.promise(
      syncMctiAsync().then((result) => {
        setUnlockedSpecs(new Set());
        return result;
      }),
      {
        loading: "Sincronizando fatores MCTI...",
        success: "Fatores MCTI atualizados!",
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Erro ao sincronizar fatores MCTI.",
      },
    );
  };

  const handleSaveSpecs = () => {
    if (!bundle?.specs) return;
    const payload: Record<string, number> = {};
    for (const field of SPEC_FIELDS) {
      const raw = specValues[field.key];
      const num = Number(raw);
      if (Number.isNaN(num)) {
        toast.error(`Valor inválido para ${field.label}`);
        return;
      }
      payload[field.key] = num;
    }
    toast.promise(
      updateSpecsAsync(payload).then((result) => {
        setUnlockedSpecs(new Set());
        return result;
      }),
      {
        loading: "Salvando especificações...",
        success: "Especificações técnicas atualizadas!",
        error: (err) =>
          err instanceof Error ? err.message : "Erro ao salvar especificações.",
      },
    );
  };

  const handleFuelChange = (
    uf: string,
    field: keyof Pick<
      FuelPriceByUF,
      "price_diesel_s10" | "price_gasolina_c" | "price_etanol"
    >,
    value: string,
  ) => {
    setLocalFuelPrices((prev) => ({
      ...prev,
      [uf]: {
        ...prev[uf],
        uf,
        [field]: value === "" ? null : Number(value),
      },
    }));
  };

  const handleSaveFuelPrices = () => {
    toast.promise(
      (async () => {
        setIsSavingFuelPrices(true);
        try {
          await Promise.all(
            ufs.map((uf) => {
              const row = localFuelPrices[uf];
              if (!row) return Promise.resolve();
              return updateFuelPriceAsync({
                uf,
                payload: {
                  price_diesel_s10: row.price_diesel_s10,
                  price_gasolina_c: row.price_gasolina_c,
                  price_etanol: row.price_etanol,
                },
              });
            }),
          );
          setUnlockedFuelRows(new Set());
        } finally {
          setIsSavingFuelPrices(false);
        }
      })(),
      {
        loading: "Salvando preços de combustível...",
        success: "Preços de combustível atualizados!",
        error: (err) =>
          err instanceof Error ? err.message : "Erro ao atualizar preços.",
      },
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando calibração...</p>;
  }

  if (isError || !bundle) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive">
            Não foi possível carregar as especificações técnicas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Especificações Técnicas</CardTitle>
            <CardDescription>
              Fatores de emissão, baselines e parâmetros da CalcEngine.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isSyncingMcti || isSavingSpecs}
            onClick={handleSyncMcti}
          >
            <RefreshCw
              className={cn("h-4 w-4", isSyncingMcti && "animate-spin")}
            />
            {isSyncingMcti ? "Sincronizando..." : "Sincronizar MCTI"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-8">
          {SPEC_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-4">
              <h3 className="text-sm font-semibold capitalize text-foreground">
                {category.title}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {category.fields.map((field) => {
                  const isUnlocked = unlockedSpecs.has(field.key);

                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="capitalize">
                        {field.label}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={field.key}
                          type="number"
                          step="any"
                          readOnly={!isUnlocked}
                          disabled={!isUnlocked}
                          className={!isUnlocked ? "bg-muted" : undefined}
                          value={specValues[field.key] ?? ""}
                          onChange={(e) =>
                            setSpecValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => toggleSpecLock(field.key)}
                          aria-label={
                            isUnlocked ? "Bloquear campo" : "Desbloquear campo"
                          }
                          title={isUnlocked ? "Bloquear" : "Clique para editar"}
                        >
                          {isUnlocked ? (
                            <LockOpen className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={handleSaveSpecs}
            disabled={isSavingSpecs || isSyncingMcti}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isSavingSpecs && "animate-spin")}
            />
            {isSavingSpecs ? "Salvando..." : "Salvar especificações técnicas"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Preços de Combustível por UF</CardTitle>
            <CardDescription>
              Sincronize com a ANP ou ajuste manualmente (mock local).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isSyncing}
            onClick={handleSyncPrices}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Sincronizando..." : "Sincronizar ANP"}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2" aria-label="Editar" />
                <th className="py-2 pr-4">UF</th>
                <th className="py-2 pr-4">Diesel S10</th>
                <th className="py-2 pr-4">Gasolina C</th>
                <th className="py-2 pr-4">Etanol</th>
              </tr>
            </thead>
            <tbody>
              {ufs.map((uf) => {
                const row = localFuelPrices[uf];
                const isRowUnlocked = unlockedFuelRows.has(uf);

                return (
                  <tr key={uf} className="border-b">
                    <td className="py-2 pr-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFuelRowLock(uf)}
                        aria-label={
                          isRowUnlocked ? "Bloquear linha" : "Desbloquear linha"
                        }
                        title={
                          isRowUnlocked ? "Bloquear" : "Clique para editar"
                        }
                      >
                        {isRowUnlocked ? (
                          <LockOpen className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="py-2 pr-4 font-medium">{uf}</td>
                    <td className="py-2 pr-4">
                      <Input
                        type="number"
                        step="any"
                        className="h-8"
                        readOnly={!isRowUnlocked}
                        disabled={!isRowUnlocked}
                        value={row.price_diesel_s10 ?? ""}
                        onChange={(e) =>
                          handleFuelChange(
                            uf,
                            "price_diesel_s10",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <Input
                        type="number"
                        step="any"
                        className="h-8"
                        readOnly={!isRowUnlocked}
                        disabled={!isRowUnlocked}
                        value={row.price_gasolina_c ?? ""}
                        onChange={(e) =>
                          handleFuelChange(
                            uf,
                            "price_gasolina_c",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <Input
                        type="number"
                        step="any"
                        className="h-8"
                        readOnly={!isRowUnlocked}
                        disabled={!isRowUnlocked}
                        value={row.price_etanol ?? ""}
                        onChange={(e) =>
                          handleFuelChange(uf, "price_etanol", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button
            type="button"
            onClick={handleSaveFuelPrices}
            disabled={isSavingFuelPrices || isSyncing}
            className="mt-4 gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isSavingFuelPrices && "animate-spin")}
            />
            {isSavingFuelPrices
              ? "Salvando..."
              : "Salvar preços de combustível"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rede Taggy</CardTitle>
            <CardDescription>
              Pedágios e estacionamentos da rede Taggy usados no cálculo da
              rota.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isSyncingTaggy}
            onClick={() => {
              toast.promise(syncTaggyAsync(), {
                loading: "Sincronizando rede Taggy...",
                success: (d) =>
                  `Sincronizado: ${d.tolls_synced} pedágios, ${d.parking_synced} estacionamentos`,
                error: "Erro ao sincronizar rede Taggy",
              });
            }}
          >
            <RefreshCw
              className={cn("h-4 w-4", isSyncingTaggy && "animate-spin")}
            />
            {isSyncingTaggy ? "Sincronizando..." : "Sincronizar Rede Taggy"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingTaggy ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : taggyPlaces ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Pedágios cadastrados
                </span>
                <span className="font-semibold">{taggyPlaces.toll_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Estacionamentos cadastrados
                </span>
                <span className="font-semibold">
                  {taggyPlaces.parking_count}
                </span>
              </div>
              {taggyPlaces.last_synced_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Última sincronização
                  </span>
                  <span className="font-medium text-foreground">
                    {formatUtcAsBrasilia(taggyPlaces.last_synced_at)}
                  </span>
                </div>
              )}
              {!taggyPlaces.toll_count && !taggyPlaces.parking_count && (
                <p className="text-muted-foreground italic">
                  Nenhum dado. Clique em Sincronizar Taggy para importar.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhum dado. Clique em Sincronizar Taggy para importar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
