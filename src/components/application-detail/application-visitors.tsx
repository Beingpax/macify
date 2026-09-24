import { MousePointer2 } from "lucide-react";
import { getAllTimeApplicationVisitors } from "@/lib/analytics/datafast-analytics";

export async function ApplicationVisitors({ slug }: { slug: string }) {
  const visitors = await getAllTimeApplicationVisitors(slug);
  const formatted = visitors === null ? null : new Intl.NumberFormat("en-US", visitors >= 10_000
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 }).format(visitors);

  return (
    <span className="application-visitors-slot">
      {formatted !== null && (
        <span
          aria-label={`${visitors?.toLocaleString("en-US")} unique visitors`}
          className="application-fact application-fact-violet application-visitors"
          title={`${visitors?.toLocaleString("en-US")} unique visitors`}
        >
          <span className="application-fact-icon" aria-hidden="true"><MousePointer2 size={17} strokeWidth={2.2} /></span>
          <span><strong>{formatted}</strong> visits</span>
        </span>
      )}
    </span>
  );
}
