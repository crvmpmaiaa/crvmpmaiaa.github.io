/** Normalised mouse position, -1..1, updated on move. Used for look around inside the portal. */
export const pointer = { x: 0, y: 0, active: false };
let bound = false;
export function bindPointer() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => { pointer.active = false; });
}
