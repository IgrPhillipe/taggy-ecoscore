import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  entityName?: string;
  onConfirm: () => void;
  isPending?: boolean;
};

export const DeleteConfirmDialog = ({
  open,
  onClose,
  title,
  entityName,
  onConfirm,
  isPending = false,
}: DeleteConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Tem certeza que deseja excluir{" "}
          {entityName ? <strong>{entityName}</strong> : "este item"}? Esta ação
          não pode ser desfeita.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={onConfirm}
        >
          <ButtonLoadingContent loading={isPending}>Excluir</ButtonLoadingContent>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
