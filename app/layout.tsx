import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Expense Chatbot",
  description: "Quản lý chi tiêu thông minh với AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
