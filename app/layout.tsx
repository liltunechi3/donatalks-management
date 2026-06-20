import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DonaTalks Management",
  description: "Internal management system untuk event DonaTalks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
