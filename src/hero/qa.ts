/** QA switches on the URL, for bisecting on real devices: ?static ?plain ?noportal ?nodust ?notemple */
export const qa = (key: string) => typeof window !== "undefined" && new URLSearchParams(window.location.search).has(key);
