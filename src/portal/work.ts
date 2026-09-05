/** Four projects on show inside the site; the rest live on the portfolio page. */
export type Project = { name: string; kind: string; line: string; image: string; alt: string; href?: string };

export const PROJECTS: Project[] = [
  { name: "Spencer Lynch", kind: "Website", line: "A Liverpool magician's site: the reel, the dates, the booking, and some of the theatre of the act.", image: "/images/work/spencer-lynch.webp", alt: "Spencer Lynch site on a phone: How did he do that?" },
  { name: "PensionAble", kind: "Product site", line: "A pension calculation engine explained on one page, with the audit trail itself as the proof.", image: "/images/work/pensionable.webp", alt: "PensionAble site on a phone: calcs solved with Diorama" },
  { name: "UCL", kind: "iOS app and backend", line: "Shifts, vehicles, earnings and safety for a working crew, with the numbers the business needed behind it.", image: "/images/work/ucl.webp", alt: "UCL app home screen on a phone" },
  { name: "C. M. Taylor", kind: "Website", line: "A writer's site: books, films, essays and one photograph doing the work of a hundred.", image: "/images/work/cm-taylor.webp", alt: "C. M. Taylor site on a phone" },
];

export const WORK_MORE = { label: "See all work", href: "/work" };

/** the rest, shown on the portfolio page with the four above */
export const MORE_PROJECTS: Project[] = [
  { name: "Jack Crump", kind: "Portfolio site", line: "A photographer's site: the pictures, the profile, nothing in the way.", image: "/images/work/jack-crump.webp", alt: "Jack Crump photography site on a phone" },
];
