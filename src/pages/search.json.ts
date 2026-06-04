import { getSearchEntries } from "../lib/content";
import { excerpt } from "../lib/format";

export async function GET() {
  const entries = await getSearchEntries();

  return Response.json(
    entries.map((entry) => ({
      ...entry,
      description: excerpt(entry.description, 120),
      text: entry.text.toLowerCase(),
    })),
  );
}
