import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import AIChatBox from "@/components/chat/AIChatBox";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChillTrip",
  description: "Chuyến đi của sự thư thái",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        {/* ✅ Fix icon Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1"
        />
      </head>

      <body
        className={`
          ${inter.variable} 
          ${plusJakartaSans.variable}
          bg-white 
          text-slate-900 
          antialiased
          font-sans
        `}
      >
        {children}
        <AIChatBox />
      </body>
    </html>
  );
}