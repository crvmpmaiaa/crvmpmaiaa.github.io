/** Everything we have built, from maiaa.ai/portfolio. The first four are on show inside the front page. */
export type Project = {
  slug: string;
  name: string;
  kind: string;          // shown on the front page cards
  tags: string[];        // shown on the work page
  line: string;
  image: string;         // phone hero, front page
  site: string;          // desktop capture, work page
  alt: string;
  url: string;
};

export const ALL_PROJECTS: Project[] = [
  { slug: "spencer-lynch", name: "Spencer Lynch", kind: "Website", tags: ["entertainment", "personal brand", "scroll film"], line: "A cinematic site for a Liverpool magician, built around bold type, dark luxury and a scroll driven showreel.", image: "/images/work/spencer-lynch.webp", site: "/images/work/sites/spencer-lynch.webp", alt: "Spencer Lynch site: How did he do that?", url: "https://howdidhedothat.co.uk/" },
  { slug: "pensionable", name: "PensionAble", kind: "Product site", tags: ["saas", "fintech", "product"], line: "Modern pension scheme software: an AI calculation engine that turns deeds, notes and workbooks into a full auditable scheme guide in days, not months.", image: "/images/work/pensionable.webp", site: "/images/work/sites/pensionable.webp", alt: "PensionAble site: calcs solved with Diorama", url: "https://pensionable.ai/" },
  { slug: "ucl", name: "UCL", kind: "iOS app and backend", tags: ["ios", "backend", "operations"], line: "Shifts, vehicles, earnings and safety for a working crew, with the reporting the business needed behind it.", image: "/images/work/ucl.webp", site: "/images/work/sites/ucl.webp", alt: "UCL app home screen", url: "" },
  { slug: "cm-taylor", name: "C. M. Taylor", kind: "Website", tags: ["author", "arts and culture", "editor"], line: "A site for the novelist, screenwriter and filmmaker Craig Taylor, built around his own footage and paintings, with book and film pages, an essays feed and a plain English editor so he runs it himself.", image: "/images/work/cm-taylor.webp", site: "/images/work/sites/cm-taylor.webp", alt: "C. M. Taylor site", url: "https://cmtaylorstory.com/" },
  { slug: "jack-crump", name: "Jack Crump Photography", kind: "Portfolio site", tags: ["photography", "portfolio", "gallery"], line: "A photography portfolio with a clean, image first design and nothing in the way of the pictures.", image: "/images/work/jack-crump.webp", site: "/images/work/sites/jack-crump.webp", alt: "Jack Crump photography site", url: "https://jackcrump.com/" },
  { slug: "we-speak-to-robots", name: "We Speak to Robots", kind: "Website", tags: ["ai", "consultancy", "saas"], line: "An AI consultancy and auditing business, with tailored solutions to help businesses bring in emerging technology and get it working.", image: "", site: "/images/work/sites/we-speak-to-robots.webp", alt: "We Speak to Robots site", url: "https://wespeaktorobots.ai/" },
  { slug: "blue-shed", name: "The Blue Shed Group", kind: "Website", tags: ["coaching", "personal development", "global"], line: "A global coaching platform helping ambitious professionals build self leadership, communication and purpose driven careers.", image: "", site: "/images/work/sites/blue-shed.webp", alt: "The Blue Shed Group site", url: "https://blueshedgroup.com/" },
  { slug: "d-farquharson", name: "D. Farquharson Contractors", kind: "Website", tags: ["construction", "landing page", "local"], line: "A professional site for a civil and groundworks contractor: services, past projects, expertise.", image: "", site: "/images/work/sites/d-farquharson.webp", alt: "D. Farquharson Contractors site", url: "https://dfarquharsoncontracts.co.uk/" },
  { slug: "waterloo-abc", name: "Waterloo ABC", kind: "Website", tags: ["sport", "boxing club", "community"], line: "A grassroots boxing gym in Liverpool: affordable training for all ages, ladies fitness, children's classes and competition training.", image: "", site: "/images/work/sites/waterloo-abc.webp", alt: "Waterloo ABC site", url: "https://waterlooabc.co.uk/" },
  { slug: "brickin-awesome", name: "Brickin' Awesome", kind: "Website", tags: ["trades", "landing page", "north wales"], line: "A brickwork and pointing specialist serving Wrexham and North Wales, with fifteen years of repointing, repairs and new builds.", image: "", site: "/images/work/sites/brickin-awesome.webp", alt: "Brickin' Awesome site", url: "https://crvmpmaiaa.github.io/BrickingAwesome/" },
  { slug: "lemovals", name: "Lemovals", kind: "Website", tags: ["removals", "landing page", "quote flow"], line: "A removals and man with a van service with an instant quote flow, clear pricing and a clean mobile first design.", image: "", site: "/images/work/sites/lemovals.webp", alt: "Lemovals site", url: "https://lemovals.co.uk/" },
];

/** the four on show inside the front page */
export const PROJECTS = ALL_PROJECTS.slice(0, 4);
export const WORK_MORE = { label: "See all work", href: "/work" };
