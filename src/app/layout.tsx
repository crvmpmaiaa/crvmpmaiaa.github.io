import type { Metadata } from "next";
import { Anton, Cormorant_Garamond, Oswald, Geist } from "next/font/google";
import "./globals.css";
import { SHARE_IMAGE, shareCard, SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME, SITE_TITLE, SITE_URL } from "./site";

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
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: shareCard(SITE_TITLE, "/"),
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [SHARE_IMAGE.url] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

/** Who we are and what we sell, in the form search engines read. */
const structured = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: "en-GB", publisher: { "@id": `${SITE_URL}/#business` } },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#business`,
      name: SITE_NAME,
      url: SITE_URL,
      email: SITE_EMAIL,
      founder: { "@type": "Person", name: "Jack Crump" },
      description: SITE_DESCRIPTION,
      logo: `${SITE_URL}/icon-512.png`,
      image: `${SITE_URL}${SHARE_IMAGE.url}`,
      address: { "@type": "PostalAddress", addressLocality: "Liverpool", addressRegion: "Merseyside", addressCountry: "GB" },
      areaServed: [{ "@type": "City", name: "Liverpool" }, { "@type": "Country", name: "United Kingdom" }],
      knowsAbout: ["Web design", "Web development", "3D web experiences", "iOS and Android apps", "Lead generation", "AI consulting"],
      contactPoint: { "@type": "ContactPoint", contactType: "sales", email: SITE_EMAIL, url: `${SITE_URL}/contact/` },
    },
  ],
};

export const viewport = { themeColor: "#14202e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${wordmark.variable} ${copyFace.variable} h-full antialiased`}>
      <head>
        {/* phones: the two big stills in before the intro flies */}
        <link rel="preload" as="image" href="/images/mobile/statue-full.webp" media="(max-width: 820px)" />
        <link rel="preload" as="image" href="/images/mobile/pillar-bare.webp" media="(max-width: 820px)" />
      </head>
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
