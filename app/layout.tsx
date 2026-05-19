import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Country Stock Sheet Digitizer",
  description: "Convert scanned handwritten country stock sheets into validated spreadsheet data."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
