import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrderOrbit - College Canteen Pre-Order & Feedback Ecosystem",
  description: "Modern campus dining, streamlined.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light" suppressHydrationWarning>
      <head>
        {/* Load Material Symbols Outlined for dashboard and action icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f9ff] text-[#071d2e] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
