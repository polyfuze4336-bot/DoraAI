import { SourcesWorkspace } from "@/components/sources-workspace";

export const metadata = {
  title: "Source Management | DORA",
  description:
    "Manage DORA connectors, schedules and source quality without exposing secrets.",
};

export default function SourcesPage() {
  return <SourcesWorkspace />;
}
