import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { DEMO_MODE } from "@/lib/demo-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Аналитика звонков",
  description: "Дашборд для руководителей: статистика по менеджерам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-60 p-6">
            {DEMO_MODE && (
              <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Пример данных — сгенерированные звонки и AI-разборы.
              </div>
            )}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
