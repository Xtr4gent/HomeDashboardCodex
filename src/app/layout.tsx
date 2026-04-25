import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "Private home budget, upgrades, and maintenance dashboard."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
