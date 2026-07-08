import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectWatch Rwanda",
  description: "AI-Powered Geospatial Intelligence Platform for Infrastructure Monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
