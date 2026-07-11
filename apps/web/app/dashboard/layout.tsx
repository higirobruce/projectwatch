import type { Metadata } from "next";
import "../space.css";

export const metadata: Metadata = {
  title: "ProjectWatch · Intelligence Dashboard",
  description: "AI-powered change detection and risk assessment for infrastructure monitoring.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="dark">{children}</div>;
}
