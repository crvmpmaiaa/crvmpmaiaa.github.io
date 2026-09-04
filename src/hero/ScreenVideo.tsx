"use client";
import { forwardRef } from "react";

/**
 * The cosmos clip. One hidden video element that feeds the portal scene's backdrop, which in turn is rendered
 * to the laptop screen. Muted, inline, loads only when the rebuild starts.
 */
export const ScreenVideo = forwardRef<HTMLVideoElement, { className?: string }>(function ScreenVideo({ className }, ref) {
  return (
    <video
      ref={ref}
      className={className ?? "hero__screen-video"}
      muted
      loop
      playsInline
      preload="metadata"
      poster="/media/cosmos-poster.jpg"
      aria-hidden="true"
    >
      <source src="/media/cosmos.mp4" type="video/mp4" />
    </video>
  );
});
