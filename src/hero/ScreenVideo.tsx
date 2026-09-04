"use client";
import { forwardRef } from "react";

/**
 * The screen content. One video element: it feeds the laptop screen as a texture, and at the last few percent
 * of the sequence it fades in fullscreen over the canvas so the hand off is invisible and the video plays at
 * native resolution. Muted, inline, preloaded, with a poster matching frame one.
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
      poster="/media/screen-poster.jpg"
      aria-hidden="true"
    >
      <source src="/media/screen.webm" type="video/webm" />
      <source src="/media/screen.mp4" type="video/mp4" />
    </video>
  );
});
