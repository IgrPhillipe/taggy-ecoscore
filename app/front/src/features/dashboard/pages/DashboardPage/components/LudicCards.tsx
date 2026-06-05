import { TreePine, Droplet, Scroll } from "lucide-react";
import { KpiCard } from "@/features/sustainability/components/MetricCard";
import { useGetImpactMetrics } from "@/features/sustainability/hooks/useGetImpactMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const LudicCards = () => {
  const { data: metrics, isLoading } = useGetImpactMetrics();

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Tradução lúdica do impacto</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded" />)}
        </div>
      </section>
    );
  }

  const ludicMetrics = [
    {
      icon: <TreePine className="text-[#72C215]" size={30} />,
      value: String(metrics?.treeSaved ?? 0),
      title: "ÁRVORES PRESERVADAS",
    },
    {
      icon: <Droplet className="text-[#72C215]" size={30} />,
      value: `${(metrics?.totalWaterSaved ?? 0).toLocaleString("pt-BR")} L`,
      title: "LITROS DE ÁGUA POUPADOS",
    },
    {
      icon: <Scroll className="text-[#72C215]" size={30} />,
      value: `${metrics?.paperSaved ?? 0} m`,
      title: "METROS DE PAPEL EVITADOS",
    },
  ];

  return (
    <section>
      <h2 className="mb-6 text-2xl font-semibold">
        Tradução lúdica do impacto
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {ludicMetrics.map((metric) => (
          <KpiCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>
    </section>
  );
};
