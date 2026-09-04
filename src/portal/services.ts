/** The six services shown inside the laptop, in rail order. Plain, specific, sentence case. */
export type Service = { title: string; lead: string; points: string[] };

export const SERVICES: Service[] = [
  {
    title: "3D Experiences",
    lead: "Scroll driven worlds like this one, built to run at sixty frames a second.",
    points: ["Real time 3D on the web", "Scroll choreography and motion", "Shader and particle effects", "Interactive product and brand pieces"],
  },
  {
    title: "Web Development",
    lead: "Sites that load fast, read well and still look right in five years.",
    points: ["Design and build in one team", "Redesigns of tired sites", "Structure that turns visits into enquiries", "Speed and accessibility as standard"],
  },
  {
    title: "Growth System",
    lead: "The site, plus the engine that sends people to it, reported every month.",
    points: ["Landing pages that convert", "Paid ads on Meta and Google", "Search that compounds over time", "Creative made for performance", "A monthly report and a call"],
  },
  {
    title: "Custom Application Builds",
    lead: "Software shaped around how your business actually runs.",
    points: ["Internal tools and dashboards", "Client portals and booking", "Integrations with what you already use"],
  },
  {
    title: "Lead Generation",
    lead: "Cold outbound that puts qualified calls in the calendar.",
    points: ["Targeting and list building", "Copy that gets replies", "Warm up, sending and follow up handled"],
  },
  {
    title: "AI Consulting",
    lead: "Where AI fits your business, and where it does not.",
    points: ["An honest audit of your workflows", "Build or buy, decided with numbers", "Rollout with your team, not around them"],
  },
];

export const SECTION_HEADING = "What we build.";
