import type { Metadata } from "next";
import "./globals.css";
import CartProvider from "@/components/ordering/CartProvider";
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
      <body><LanguageProvider><CartProvider>{children}</CartProvider></LanguageProvider></body>
    </html>
  );
}
