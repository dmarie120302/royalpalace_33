import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Obra Clara",
  description: "Gestión de obras, contratistas y presupuestos.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#514ac8",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
