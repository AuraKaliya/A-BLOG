import { getExploreEntries } from "../lib/content";

export async function GET() {
  const entries = await getExploreEntries();
  return Response.json(entries);
}
