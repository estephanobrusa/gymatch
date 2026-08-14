import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { JsonLd } from "@/components/seo/JsonLd";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gymatch.app"),
  title: {
    default: "Gymatch — Find Your Perfect Training Partner",
    template: "%s | Gymatch",
  },
  description:
    "Gymatch connects gym-goers who share the same schedule, discipline, and training goals. Find your perfect workout partner nearby.",
  keywords: [
    "gym partner",
    "workout partner",
    "training partner",
    "fitness app",
    "gym buddy",
    "find gym partner",
  ],
  authors: [{ name: "Gymatch" }],
  creator: "Gymatch",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gymatch.app",
    siteName: "Gymatch",
    title: "Gymatch — Find Your Perfect Training Partner",
    description:
      "Connect with gym-goers who share your schedule, discipline, and training goals.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gymatch — Find Your Perfect Training Partner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gymatch — Find Your Perfect Training Partner",
    description:
      "Connect with gym-goers who share your schedule, discipline, and training goals.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Gymatch",
  url: "https://gymatch.app",
  description:
    "Gymatch connects gym-goers who share the same schedule, discipline, and training goals.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://gymatch.app/login",
    "query-input": "required name=search_term_string",
  },
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Gymatch",
  url: "https://gymatch.app",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Find your perfect gym training partner based on schedule, discipline, and fitness goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <JsonLd data={websiteSchema} />
        <JsonLd data={webAppSchema} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
