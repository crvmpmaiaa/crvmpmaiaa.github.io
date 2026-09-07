import type { Metadata } from "next";
import { Anton, Cormorant_Garamond, Oswald, Geist } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const copyFace = Oswald({
  variable: "--font-copy-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const wordmark = Anton({
  variable: "--font-wordmark-src",
  subsets: ["latin"],
  weight: "400",
});

const body = Geist({
  variable: "--font-body-src",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Build Different",
  description: "Websites and software with the weight of something built to stand.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport = { themeColor: "#14202e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${wordmark.variable} ${copyFace.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
