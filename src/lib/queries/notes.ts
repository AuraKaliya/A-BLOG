import { getCollection } from "astro:content";
import { withSlug } from "../content-entry";
import type { NoteEntry } from "../content-types";

export function sortNotesByDate(notes: NoteEntry[]) {
  return notes.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPublishedNotes() {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  return sortNotesByDate(notes.map(withSlug));
}

export async function getFeaturedNotes(limit = 3) {
  const notes = await getPublishedNotes();
  return notes.filter((note) => note.data.featured).concat(notes.filter((note) => !note.data.featured)).slice(0, limit);
}
