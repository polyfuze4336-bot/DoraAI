import { PerformanceWorkspace } from "@/components/performance-workspace";

export const metadata = {
  title: "Forecast Performance | DORA",
  description: "Objective DORA forecast accuracy and calibration evaluation.",
};

export default function PerformancePage() {
  return <PerformanceWorkspace />;
}
