import type { Metadata } from "next";
import AIChatBox from "@/components/chat/AIChatBox";
import "./globals.css";

const inter = {
  variable: "font-sans",
};

const plusJakartaSans = {
  variable: "font-sans",
};

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