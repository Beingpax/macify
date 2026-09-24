import { requireAdminRequest } from "@/lib/auth/admin-auth";
import { createApplicationsCsv } from "@/lib/dashboard/dashboard-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminRequest(request))) return new Response("Unauthorized", { status: 401 });

  const origin = new URL(request.url).origin;
  const csv = await createApplicationsCsv(origin);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="macify-applications-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
