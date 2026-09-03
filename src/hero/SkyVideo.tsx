"use client";

/**
 * Sky as a looping video (Kling clouds, cut into a seamless 8 second loop by tools/media). Runs on its own
 * clock, untouched by scroll. Under reduced motion or when autoplay is refused the poster frame stays.
 */
export function SkyVideo({ frozen = false }: { frozen?: boolean }) {
  if (frozen) {
    return <img className="hero__canvas hero__canvas--sky hero__sky-poster" src="/media/sky-poster.jpg" alt="" aria-hidden="true" />;
  }
  return (
    <video
      className="hero__canvas hero__canvas--sky"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/media/sky-poster.jpg"
      aria-hidden="true"
    >
      <source src="/media/sky.webm" type="video/webm" />
      <source src="/media/sky.mp4" type="video/mp4" />
    </video>
  );
}
