/** The six services shown inside the laptop, in rail order. Copy from the brief, sentence case. */
export type Service = { title: string; lead: string; points: string[] };

export const SERVICES: Service[] = [
  {
    title: "3D Experiences",
    lead: "The page you are on is one.",
    points: ["3D website elements", "Interactive scroll animations", "GSAP and advanced motion", "Experimental web interactions"],
  },
  {
    title: "Web Development",
    lead: "Sites built to be read, and to last.",
    points: ["UI and UX design", "Website design and redesign", "Conversion focused structure"],
  },
  {
    title: "Growth System",
    lead: "Everything in Web Development, plus the engine that brings people to it.",
    points: ["Landing pages", "Conversion optimisation", "Paid ads management across Meta and Google", "Performance creative", "Ongoing SEO", "A monthly report and strategy call"],
  },
  {
    title: "Custom Application Builds",
    lead: "Software built around how your business actually runs.",
    points: [],
  },
  {
    title: "Lead Generation",
    lead: "Cold outbound that fills the calendar.",
    points: [],
  },
  {
    title: "AI Consulting",
    lead: "Where AI fits your business, and where it does not.",
    points: [],
  },
];

export const SECTION_HEADING = "What we build.";
