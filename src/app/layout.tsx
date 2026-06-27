import type { Metadata } from "next";
import { AppProvider } from "@/context/AppContext";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "KumbhConnect AI - Nashik Kumbh Mela 2027",
  description: "Unified missing person registry and response platform for Nashik Kumbh Mela 2027, powered by Supabase and Claude AI.",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebAppCapable: "yes",
  appleWebAppStatusBarStyle: "default",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090b0f] text-slate-100 antialiased">
        <AppProvider>
          <OfflineSyncManager />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
