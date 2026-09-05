/** Every line of copy on the hero, with when it shows (hero p) and where. Line breaks fall between sentences. */
export type Line = { key: string; text: string; place: string; in: [number, number]; out: [number, number] };

export const WORDMARK = ["Build", "Different"] as const;
export const CTA = "Start a project";
export const SCROLL_HINT = "Scroll";

export const LINES: Line[] = [
  // over the statue, once the wordmark has gone
  { key: "carved", text: "Carved to be remembered.\nIt worked.", place: "left", in: [0.13, 0.18], out: [0.24, 0.27] },
  // the hold: the first half, then the second fades in underneath; both go as he moves to the middle
  { key: "people", text: "People have always wanted the same thing:", place: "left-a", in: [0.28, 0.32], out: [0.39, 0.42] },
  { key: "outlives", text: "to build something that outlives them and carries their name.", place: "left-b", in: [0.32, 0.36], out: [0.39, 0.42] },
  // the crumble: high and compressed on the left, then the sand line on the right just after halfway
  { key: "forgets", text: "Yet your brand lives somewhere that forgets everything by next year.", place: "top-left tight", in: [0.46, 0.5], out: [0.56, 0.59] },
  { key: "sand", text: "Online, most names are written in sand.", place: "right", in: [0.53, 0.57], out: [0.62, 0.65] },
  // the rebuild: a stack that pops in, one line at a time
  { key: "not", text: "It does not have to be.", place: "stack-0", in: [0.65, 0.68], out: [0.79, 0.81] },
  { key: "feel", text: "Your brand can feel", place: "stack-1", in: [0.68, 0.7], out: [0.79, 0.81] },
  { key: "considered", text: "Considered.", place: "stack-2", in: [0.71, 0.725], out: [0.79, 0.81] },
  { key: "permanent", text: "Permanent.", place: "stack-3", in: [0.74, 0.755], out: [0.79, 0.81] },
  { key: "stand", text: "Built to stand.", place: "stack-4", in: [0.77, 0.785], out: [0.79, 0.81] },
  // the pillar: either side, then the close
  { key: "imagine", text: "Whatever you can imagine,\nwe can build.", place: "left", in: [0.8, 0.83], out: [0.89, 0.91] },
  { key: "worthy", text: "Something worthy\nof your name.", place: "right", in: [0.83, 0.86], out: [0.89, 0.91] },
  { key: "faster", text: "Faster and cheaper than has ever been possible.", place: "bottom", in: [0.86, 0.885], out: [0.89, 0.91] },
];
