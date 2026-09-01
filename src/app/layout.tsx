import Script from "next/script";
import type { Metadata } from 'next';
import {
  Cormorant_Garamond,
  Outfit,
} from 'next/font/google';

import Footer from '@/components/Footer';
import { SITE_URL } from '@/lib/wordpress';

import './globals.css';

const serif = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['600'],
  style: ['normal'],
});

const sans = Outfit({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: [
    '300',
    '400',
    '500',
    '600',
    '700',
  ],
});

const defaultTitle =
  'CookeTricks - Recipes & Practical Cooking Guides';

const defaultDescription =
  'Practical recipes, clear cooking instructions and useful kitchen guides for busy home cooks.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  applicationName: 'CookeTricks',

  title: {
    default: defaultTitle,
    template: '%s | CookeTricks',
  },

  description: defaultDescription,

  creator: 'CookeTricks Editorial',
  publisher: 'CookeTricks',

  category: 'Food and Drink',

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

  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: SITE_URL,
    siteName: 'CookeTricks',
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },

  icons: {
    icon: '/favicon.ico',
  },
};
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full font-sans antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f9f7f2] text-[#2c2c2c]">
  {GA_MEASUREMENT_ID && (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )}
        {children}
        <Footer />
      </body>
    </html>
  );
}