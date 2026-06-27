import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AETHER — A Whisper to the Void",
  description: "A living 3D cosmos that listens to your thoughts.",
  openGraph: {
    title: "AETHER — A Whisper to the Void",
    description: "A living 3D cosmos that listens to your thoughts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#050308] overflow-hidden">
        {children}
      </body>
    </html>
  );
}
