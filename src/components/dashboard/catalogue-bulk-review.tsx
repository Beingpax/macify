"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { decideCatalogueRevisions } from "@/app/dashboard/catalogue/actions";

export function CatalogueBulkReview({ children, enabled, itemCount, returnPath }: {
  children: ReactNode;
  enabled: boolean;
  itemCount: number;
  returnPath: "/dashboard/catalogue" | "/dashboard/deals";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  if (!enabled) return children;

  const selectedInputs = () => Array.from(
    formRef.current?.querySelectorAll<HTMLInputElement>('input[name="revisionId"]:checked') ?? [],
  );

  const updateSelectedCount = () => setSelectedCount(selectedInputs().length);

  const toggleAll = () => {
    const inputs = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>('input[name="revisionId"]') ?? [],
    );
    const shouldSelect = inputs.some((input) => !input.checked);
    inputs.forEach((input) => { input.checked = shouldSelect; });
    setSelectedCount(shouldSelect ? inputs.length : 0);
  };

  const confirmDecision = (event: FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "reject" ? "reject" : "publish";
    const verb = intent === "publish" ? "Publish" : "Reject";
    const consequence = intent === "publish"
      ? "This will update the public catalogue immediately."
      : "The public catalogue will not be changed.";
    if (!window.confirm(`${verb} ${selectedCount} selected revision${selectedCount === 1 ? "" : "s"}?\n\n${consequence}`)) {
      event.preventDefault();
    }
  };

  return (
    <form action={decideCatalogueRevisions} className="catalogue-bulk-form" onChange={updateSelectedCount} onSubmit={confirmDecision} ref={formRef}>
      <input name="returnPath" type="hidden" value={returnPath} />
      <div className="catalogue-bulk-toolbar" aria-label="Bulk review actions">
        <button className="catalogue-select-all" onClick={toggleAll} type="button">
          {selectedCount === itemCount ? "Clear selection" : `Select all ${itemCount}`}
        </button>
        <span aria-live="polite">{selectedCount} selected</span>
        <BulkActionButtons selectedCount={selectedCount} />
      </div>
      {children}
    </form>
  );
}

function BulkActionButtons({ selectedCount }: { selectedCount: number }) {
  const { pending, data } = useFormStatus();
  return (
    <div>
      <button className="button-primary" disabled={pending || selectedCount === 0} name="intent" type="submit" value="publish">
        {pending && data?.get("intent") === "publish" ? "Publishing…" : `Publish selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
      </button>
      <button className="button-secondary button-danger" disabled={pending || selectedCount === 0} name="intent" type="submit" value="reject">
        {pending && data?.get("intent") === "reject" ? "Rejecting…" : `Reject selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
      </button>
    </div>
  );
}
