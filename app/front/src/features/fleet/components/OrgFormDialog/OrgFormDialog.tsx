import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CnpjInput } from "@/components/ui/CnpjInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formFieldErrorId } from "@/components/form/FormField";
import { fieldControlErrorClassName } from "@/lib/field-control";
import { optionalCnpjSchema } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";

export type OrgFormData = { name: string; cnpj: string };

const defaultForm: OrgFormData = { name: "", cnpj: "" };

type OrgFormDialogProps = {
  open: boolean;
  onClose: () => void;
  initial?: OrgFormData;
  onSubmit: (data: OrgFormData) => void;
  title: string;
  isPending?: boolean;
};

export const OrgFormDialog = ({
  open,
  onClose,
  initial,
  onSubmit,
  title,
  isPending = false,
}: OrgFormDialogProps) => {
  const [form, setForm] = useState<OrgFormData>(initial ?? defaultForm);
  const [cnpjError, setCnpjError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setForm(initial ?? defaultForm);
      setCnpjError(undefined);
    }
  }, [open, initial]);

  const handleSubmit = () => {
    const parsed = optionalCnpjSchema.safeParse(form.cnpj);
    if (!parsed.success) {
      setCnpjError(parsed.error.issues[0]?.message ?? "CNPJ inválido");
      return;
    }

    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Nome *</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome da organização"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="org-cnpj">CNPJ</Label>
            <CnpjInput
              id="org-cnpj"
              value={form.cnpj}
              onChange={(value) => {
                setCnpjError(undefined);
                setForm((prev) => ({ ...prev, cnpj: value }));
              }}
              aria-invalid={!!cnpjError}
              aria-describedby={cnpjError ? formFieldErrorId("org-cnpj") : undefined}
              className={cn(cnpjError && fieldControlErrorClassName)}
            />
            {cnpjError ? (
              <p id={formFieldErrorId("org-cnpj")} className="text-xs text-destructive">
                {cnpjError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isPending}>
              <ButtonLoadingContent loading={isPending}>
                Salvar
              </ButtonLoadingContent>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
