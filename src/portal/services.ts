/** The six services shown inside the laptop, in rail order. Plain, specific, sentence case. */
export type Service = { title: string; lead: string; points: string[]; image: string; alt: string };

export const SERVICES: Service[] = [
  {
    title: "3D Experiences",
    image: "/images/services/3d.webp",
    alt: "A marble hand holding a glowing marble cube",
    lead: "Scroll driven worlds like this one, built to run at sixty frames a second.",
    points: ["Real time 3D on the web", "Scroll choreography and motion", "Shader and particle effects", "Interactive product and brand pieces"],
  },
  {
    title: "Web Development",
    image: "/images/services/web.webp",
    alt: "A marble head resolving into pixels",
    lead: "Timeless sites that load fast and read well.",
    points: ["Design and build in one team", "Redesigns of tired sites", "Structure that turns visits into enquiries", "Speed and accessibility as standard"],
  },
  {
    title: "Growth System",
    image: "/images/services/growth.webp",
    alt: "A row of marble columns rising like a chart, the tallest lit",
    lead: "The site, plus the engine that sends people to it, reported every month.",
    points: ["Landing pages that convert", "Paid ads on Meta and Google", "Search that compounds over time", "Creative made for performance", "A monthly report and a call"],
  },
  {
    title: "Custom Application Builds",
    image: "/images/services/apps.webp",
    alt: "Marble gears meshing, lit from within",
    lead: "Software shaped around how your business actually runs.",
    points: ["Internal tools and dashboards", "Client portals and booking", "Integrations with what you already use"],
  },
  {
    title: "Lead Generation",
    image: "/images/services/leads.webp",
    alt: "A marble archer drawing a bow",
    lead: "Cold outbound that puts qualified calls in the calendar.",
    points: ["Targeting and list building", "Copy that gets replies", "Warm up, sending and follow up handled"],
  },
  {
    title: "AI Consulting",
    image: "/images/services/ai.webp",
    alt: "A marble bust with circuitry etched into the temple",
    lead: "Where AI fits your business, and where it does not.",
    points: ["An honest audit of your workflows", "Build or buy, decided with numbers", "Rollout with your team, not around them"],
  },
];

export const SECTION_HEADING = "What we build.";
