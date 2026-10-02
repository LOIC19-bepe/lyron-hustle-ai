import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LYRON HUSTLE AI — Ton business. Tes chiffres. Tes décisions.",
  description:
    "Le copilote intelligent des entrepreneurs africains. Comprends tes ventes, tes dépenses et tes bénéfices pour prendre de meilleures décisions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
