import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PKMS - Project & Key Management System",
  description: "Secure vault for managing projects and secrets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
