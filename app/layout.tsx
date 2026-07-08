import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aether-ashz.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "AETHER — A Whisper to the Void",
  description:
    "Whisper a thought and watch it become a galaxy. An AI-powered living cosmos of 40,000 particles, 30 galaxy forms, spatial audio, and your personal constellation of memories.",
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
      "Whisper a thought and watch it become a galaxy. 40,000 particles. 30 living galaxy forms. Your thoughts, written in stars.",
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
    <html lang="en">
      <body className="antialiased bg-[#050308] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
