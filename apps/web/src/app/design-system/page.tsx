import type { Metadata } from "next";

import { DesignSystemGallery } from "@/components/design-system-gallery";

export const metadata: Metadata = {
  title: "DORA Design System",
  description:
    "DORA executive intelligence component states and visual language.",
};

export default function DesignSystemPage() {
  return <DesignSystemGallery />;
}
