import { AlertsWorkspace } from "@/components/alerts-workspace";

export const metadata = {
  title: "Alerts | DORA",
  description: "Deduplicated, evidence-backed DORA alerts and acknowledgement.",
};

export default function AlertsPage() {
  return <AlertsWorkspace />;
}
