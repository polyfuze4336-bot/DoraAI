import { SettingsWorkspace } from "@/components/settings-workspace";

export const metadata = {
  title: "Admin Configuration | DORA",
  description:
    "Authorized DORA configuration with Key Vault secret references.",
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
