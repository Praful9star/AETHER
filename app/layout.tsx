import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Fraunces — a characterful editorial serif with true optical italics,
// replacing the default-browser-font Georgia everywhere headlines and
// whispered copy appear. Inter — a clean, widely-trusted grotesk for
// labels/nav/buttons, replacing the Helvetica Neue/Arial system fallback.
// Both self-hosted via next/font (no runtime request to Google, no
// render-blocking @import), exposed as CSS variables so every existing
// fontFamily reference in the app can point at var(--font-serif) /
// var(--font-sans) instead of a hardcoded system-font string.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["300", "400", "500"],
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aether-ashz.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "AETHER — A Whisper to the Void",
  description:
    "Whisper a thought and watch it become a galaxy. An AI-powered living cosmos of 40,000 particles, 34 galaxy forms, spatial audio, and your personal constellation of memories.",
  keywords: [
    "aether", "galaxy", "cosmos", "AI art", "generative art", "particle universe",
    "emotional journal", "interactive art", "3D", "webgl", "meditation",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AETHER",
  },
  openGraph: {
    title: "AETHER — A Whisper to the Void",
    description:
      "Whisper a thought and watch it become a galaxy. 40,000 particles. 34 living galaxy forms. Your thoughts, written in stars.",
    type: "website",
    url: BASE_URL,
    siteName: "AETHER",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "AETHER — A Living Cosmos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AETHER — A Whisper to the Void",
    description:
      "Whisper a thought and watch it become a galaxy. Your thoughts, written in stars.",
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050308",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="antialiased bg-[#050308] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
