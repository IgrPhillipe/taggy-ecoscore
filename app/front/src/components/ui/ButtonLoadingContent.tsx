import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonLoadingContentProps = {
  loading: boolean;
  children: ReactNode;
};

export function ButtonLoadingContent({
  loading,
  children,
}: ButtonLoadingContentProps) {
  if (!loading) {
    return children;
  }

  return (
    <>
      <Loader2 className="size-4 animate-spin" />
      {children}
    </>
  );
}
