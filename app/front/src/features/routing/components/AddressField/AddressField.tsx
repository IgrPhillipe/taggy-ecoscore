import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  retrieveSuggestionCoords,
  useAddressSuggestions,
  type AddressSuggestion,
} from "../../hooks/useAddressSuggestions";
import { formatSuggestionLabel } from "../../lib/route-location";
import type { RouteStop } from "../../lib/route-location";

function AddressSuggestionsPortal({
  anchorRef,
  open,
  suggestions,
  onSelect,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  suggestions: AddressSuggestion[];
  onSelect: (s: AddressSuggestion) => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, suggestions.length, anchorRef]);

  if (!open || !suggestions.length) return null;

  return createPortal(
    <ul
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="max-h-56 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
    >
      {suggestions.map((s, i) => (
        <li
          key={`${s.mapbox_id ?? s.display_name}-${i}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
          className="cursor-pointer px-3 py-2.5 hover:bg-accent hover:text-accent-foreground"
        >
          <p className="text-sm font-medium leading-snug">{s.display_name}</p>
          {s.subtitle ? (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {s.subtitle}
            </p>
          ) : null}
        </li>
      ))}
    </ul>,
    document.body,
  );
}

type AddressFieldProps = {
  id: string;
  label: string;
  icon: ReactNode;
  placeholder: string;
  inputValue: string;
  resolved: RouteStop | null;
  onInputChange: (text: string) => void;
  onSelectStop: (stop: RouteStop) => void;
  onClear: () => void;
  className?: string;
};

export function AddressField({
  id,
  label,
  icon,
  placeholder,
  inputValue,
  resolved,
  onInputChange,
  onSelectStop,
  onClear,
  className,
}: AddressFieldProps) {
  const [focused, setFocused] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const queryForSuggestions =
    focused && inputValue.trim().length >= 3 ? inputValue : "";
  const { suggestions, clear } = useAddressSuggestions(queryForSuggestions);

  const handleClear = () => {
    onClear();
    clear();
  };

  const handleSelect = async (s: AddressSuggestion) => {
    clear();
    let lat = s.lat;
    let lng = s.lon;
    if ((lat === null || lng === null) && s.mapbox_id) {
      const coords = await retrieveSuggestionCoords(s.mapbox_id);
      if (!coords) return;
      lat = coords.lat;
      lng = coords.lon;
    }
    if (lat === null || lng === null) return;
    onSelectStop({
      lat,
      lng,
      label: formatSuggestionLabel(s.display_name, s.subtitle),
    });
    setFocused(false);
  };

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div ref={anchorRef} className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          value={inputValue}
          placeholder={placeholder}
          clearable
          onClear={handleClear}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className={cn("pl-9", resolved && "bg-success/5 ring-1 ring-success/20")}
          autoComplete="off"
          title={resolved?.label}
        />
        <AddressSuggestionsPortal
          anchorRef={anchorRef}
          open={focused && suggestions.length > 0}
          suggestions={suggestions}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
