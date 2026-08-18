import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import { AskDora } from "@/components/ask-dora";
import { DemoStory } from "@/components/demo-story";
import "./globals.css";

export const metadata: Metadata = {
  title: "DORA | Commodity Intelligence",
  description:
    "AI-powered commodity intelligence and management decision support.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        {process.env.NEXT_PUBLIC_DORA_DEMO_STORY_ENABLED !== "false" ? (
          <DemoStory />
        ) : null}
        <AskDora />
      </body>
    </html>
  );
}
