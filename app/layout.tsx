import type { Metadata } from "next";
import "./globals.css";
import LanguageProvider from "@/components/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "eTandoori",
  description: "Authentic Indian Cuisine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
