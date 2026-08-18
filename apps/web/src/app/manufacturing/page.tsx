import { ManufacturingWorkspace } from "@/components/manufacturing-workspace";

export const metadata = {
  title: "Manufacturing Intelligence | DORA",
  description:
    "Capacity, output, inventory, demand, and feedstock intelligence.",
};

export default function ManufacturingPage() {
  return <ManufacturingWorkspace />;
}
