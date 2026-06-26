import { Construction } from "lucide-react";

export function ComingSoon({ phase }: { phase?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Construction className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium">Em construção</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Esta secção está a ser desenvolvida{phase ? ` na ${phase}` : ""}.
      </p>
    </div>
  );
}
