import type { MetadataRoute } from "next";
import { ALL_PROJECTS } from "@/portal/work";
import { SITE_URL } from "./site";

export const dynamic = "force-static";

/** Every page on the site. Trailing slashes match the export. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const page = (path: string, priority: number) => ({ url: `${SITE_URL}${path}`, lastModified, priority });
  return [
    page("/", 1),
    page("/work/", 0.8),
    page("/about/", 0.6),
    page("/contact/", 0.6),
    page("/privacy/", 0.3),
    ...ALL_PROJECTS.map((p) => page(`/work/${p.slug}/`, 0.5)),
  ];
}
