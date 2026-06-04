import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { countActiveFilters } from "@/lib/filter-utils";

type UseFilterDraftOptions<T extends Record<string, unknown>> = {
  applied: T;
  defaults: T;
  onApply: (values: T) => void;
  onClear?: (values: T) => void;
};

export function useFilterDraft<T extends Record<string, unknown>>({
  applied,
  defaults,
  onApply,
  onClear,
}: UseFilterDraftOptions<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<T>(applied);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(applied);
    }
    wasOpenRef.current = open;
  }, [open, applied]);

  const activeCount = useMemo(
    () => countActiveFilters(applied, defaults),
    [applied, defaults],
  );

  const draftActiveCount = useMemo(
    () => countActiveFilters(draft, defaults),
    [draft, defaults],
  );

  const apply = useCallback(() => {
    onApply(draft);
    setOpen(false);
  }, [draft, onApply]);

  const clear = useCallback(() => {
    setDraft(defaults);
    if (onClear) {
      onClear(defaults);
    } else {
      onApply(defaults);
    }
    setOpen(false);
  }, [defaults, onApply, onClear]);

  const updateDraft = useCallback((partial: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  return {
    open,
    setOpen,
    draft,
    setDraft,
    updateDraft,
    apply,
    clear,
    activeCount,
    draftActiveCount,
  };
}
