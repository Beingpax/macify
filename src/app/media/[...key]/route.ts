import { serveMedia } from "@/lib/media/media-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  return serveMedia(request, segments, "published");
}
