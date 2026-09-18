/** The facts search engines and share cards are given, in one place. */
export const SITE_URL = "https://builddifferent.dev";
export const SITE_NAME = "Build Different";
export const SITE_TITLE = "Build Different: websites, apps and 3D experiences built to last";
export const SITE_DESCRIPTION = "Build Different designs and builds websites, custom apps and real time 3D experiences for brands that want to be remembered. Fast, accessible and built to last.";
export const SITE_EMAIL = "jack@builddifferent.dev";
export const SHARE_IMAGE = { url: "/og.jpg", width: 1200, height: 630, alt: "Build Different: a marble figure of Hercules against a blue sky" };

/** A page's share card. Next replaces the layout's openGraph whole rather than merging, so each page gives the full set. */
export function shareCard(title: string, path: string, description: string = SITE_DESCRIPTION, image: { url: string; width: number; height: number; alt: string } = SHARE_IMAGE) {
  return { type: "website" as const, siteName: SITE_NAME, locale: "en_GB", url: path, title, description, images: [image] };
}
