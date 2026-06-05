import { getContentGraphData } from "../lib/content";

export async function GET() {
  return Response.json(await getContentGraphData());
}
