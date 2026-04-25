import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "Private home budget, upgrades, and maintenance dashboard."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var savedTheme = localStorage.getItem("home-dashboard-theme");
  var theme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch (_) {}
`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
