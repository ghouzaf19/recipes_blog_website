import type { Metadata } from "next";
import "./globals.css";

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
  metadataBase: new URL('https://www.cooketricks.com'),
  title: {
    default: "CookeTricks - Expert Culinary Tricks & Recipes",
    template: "%s | CookeTricks"
  },
  description: "Discover the best cooking tricks, expert culinary hacks, and delicious recipes from around the world. Master your kitchen with CookeTricks.",
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
    title: "CookeTricks - Expert Culinary Tricks & Recipes",
    description: "Discover the best cooking tricks, expert culinary hacks, and delicious recipes from around the world. Master your kitchen with CookeTricks.",
    url: "https://www.cooketricks.com",
    siteName: "CookeTricks",
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    title: "CookeTricks - Expert Culinary Tricks & Recipes",
    creator: '@cooketricks',
    description: "Discover the best cooking tricks, expert culinary hacks, and delicious recipes from around the world. Master your kitchen with CookeTricks.",
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
