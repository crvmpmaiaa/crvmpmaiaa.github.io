import { HERO_FRACTION, Q } from "./beats";
import { scrollControl } from "./progress";

/** section progress where the laptop deck begins */
export const SERVICES_S = HERO_FRACTION + (1 - HERO_FRACTION) * Q.arrive[0];

export function goToServices() { scrollControl.toSection(SERVICES_S); }
