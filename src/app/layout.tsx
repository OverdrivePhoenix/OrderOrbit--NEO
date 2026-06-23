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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const theme = savedTheme || systemTheme;
                  document.documentElement.classList.add(theme);
                  if (theme === 'dark') document.documentElement.classList.remove('light');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `
          }}
        />
        {/* Load Material Symbols Outlined for dashboard and action icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
