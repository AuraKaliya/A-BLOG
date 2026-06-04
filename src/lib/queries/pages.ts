import { getEntry } from "astro:content";
import type { AboutPageEntry, HomePageEntry, LabPageEntry, NowPageEntry, PageEntry } from "../content-types";

async function requirePage(id: "home" | "about" | "lab" | "now") {
  const page = await getEntry("pages", id);

  if (!page) {
    throw new Error(`Missing page content entry: ${id}`);
  }

  return page;
}

export async function getHomePageData(): Promise<HomePageEntry> {
  const page = (await requirePage("home")) as PageEntry;
  if (page.data.kind !== "home") throw new Error("Page content mismatch for home");
  return page as HomePageEntry;
}

export async function getAboutPageData(): Promise<AboutPageEntry> {
  const page = (await requirePage("about")) as PageEntry;
  if (page.data.kind !== "about") throw new Error("Page content mismatch for about");
  return page as AboutPageEntry;
}

export async function getLabPageData(): Promise<LabPageEntry> {
  const page = (await requirePage("lab")) as PageEntry;
  if (page.data.kind !== "lab") throw new Error("Page content mismatch for lab");
  return page as LabPageEntry;
}

export async function getNowPageData(): Promise<NowPageEntry> {
  const page = (await requirePage("now")) as PageEntry;
  if (page.data.kind !== "now") throw new Error("Page content mismatch for now");
  return page as NowPageEntry;
}
