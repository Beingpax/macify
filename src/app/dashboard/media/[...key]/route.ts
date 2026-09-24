import { serveMedia } from "@/lib/media/media-response";
import { requireAdminRequest } from "@/lib/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!(await requireAdminRequest(request))) return new Response("Unauthorized", { status: 401 });
  const { key: segments } = await params;
  return serveMedia(request, segments, "dashboard");
}
