import "../globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartContext";
import { FloatingHeader } from "@/components/FloatingHeader";
import SentryInit from '@/components/SentryInit';

export const metadata = {
  title: "RifaFood",
  description: "Plataforma de rifas alimentícias estilo iFood",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <CartProvider>
            <SentryInit />
            <FloatingHeader />
            <div className="min-h-screen bg-gray-50 pt-16">{children}</div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
