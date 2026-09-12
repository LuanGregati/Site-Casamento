import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luan e Mariana • 08/05/2027",
  description: "Confirme sua presença no casamento de Luan e Mariana e escolha um presente. 08/05/2027.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
