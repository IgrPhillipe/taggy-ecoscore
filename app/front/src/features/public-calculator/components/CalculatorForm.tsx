import { useState } from "react";
import { Car, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlateInput } from "@/components/ui/PlateInput";
import type { PublicCalculatorRequest } from "../api/types";

interface Props {
  onSubmit: (values: PublicCalculatorRequest) => void;
  isLoading: boolean;
}

export function CalculatorForm({ onSubmit, isLoading }: Props) {
  const [plate, setPlate] = useState("");
  const [pedagio, setPedagio] = useState(8);
  const [uf, setUf] = useState("SP");
  const [estac, setEstac] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;
    onSubmit({
      plate: plate.trim(),
      monthly_pedagio: pedagio,
      uf,
      monthly_estacionamento: estac,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="plate" className="flex items-center gap-2 text-sm font-medium">
          <Car className="h-4 w-4 text-emerald-600" />
          Placa do veículo
        </Label>
        <PlateInput
          id="plate"
          value={plate}
          onChange={setPlate}
          placeholder="ABC-1234"
          className="text-lg font-mono tracking-widest text-center h-12"
          required
        />
        <p className="text-xs text-neutral-500">
          Usamos a placa para identificar o tipo de veículo e combustível.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between text-sm font-medium">
          <span>Pedágios por mês</span>
          <span className="text-lg font-bold text-emerald-600">{pedagio}×</span>
        </Label>
        <input
          type="range"
          min={1}
          max={60}
          value={pedagio}
          onChange={(e) => setPedagio(Number(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-neutral-400">
          <span>1×</span>
          <span>30×</span>
          <span>60×</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between text-sm font-medium">
          <span>Estacionamentos por mês <span className="text-neutral-400 font-normal">(opcional)</span></span>
          <span className="text-lg font-bold text-emerald-600">{estac}×</span>
        </Label>
        <input
          type="range"
          min={0}
          max={30}
          value={estac}
          onChange={(e) => setEstac(Number(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-neutral-400">
          <span>0×</span>
          <span>15×</span>
          <span>30×</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-emerald-600" />
          Estado <span className="text-neutral-400 font-normal">(para preço do combustível)</span>
        </Label>
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {[
            "AC","AL","AP","AM","BA","CE","DF","ES","GO",
            "MA","MT","MS","MG","PA","PB","PR","PE","PI",
            "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
          ].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        disabled={!plate.trim() || isLoading}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base"
      >
        {isLoading ? "Calculando..." : "Calcular minha economia"}
      </Button>
    </form>
  );
}
