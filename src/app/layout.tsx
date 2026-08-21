import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/wordpress";

import { Cormorant_Garamond, Outfit } from "next/font/google";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CookeTricks - Recipes & Practical Cooking Guides",
    template: "%s | CookeTricks"
  },
  description: "Discover recipes, tested cooking notes, and practical kitchen guides from CookeTricks.",
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Additional metadata for better SEO
  openGraph: {
    title: "CookeTricks - Recipes & Practical Cooking Guides",
    description: "Discover recipes, tested cooking notes, and practical kitchen guides from CookeTricks.",
    url: SITE_URL,
    siteName: "CookeTricks",
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    title: "CookeTricks - Recipes & Practical Cooking Guides",
    description: "Discover recipes, tested cooking notes, and practical kitchen guides from CookeTricks.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f9f7f2] text-[#2c2c2c]">
        {children}
        <Footer />
      </body>
    </html>
  );
}
