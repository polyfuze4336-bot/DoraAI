"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Bot,
  CalendarClock,
  Database,
  KeyRound,
  LoaderCircle,
  Map,
  Save,
  Settings2,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AdminSettings {
  commodities: { id: string; name: string; enabled: boolean }[];
  regions: string[];
  providers: Record<
    string,
    {
      enabled: boolean;
      refreshMinutes: number;
      keyVaultSecretName?: string;
    }
  >;
  refreshSchedules: Record<string, number>;
  weeklyReportSchedule: {
    day: string;
    localTime: string;
    timezone: string;
  };
  reportRecipients: string[];
  alertThresholds: {
    priceMovementPercent: number;
    forecastDirectionChange: boolean;
    riskScore: number;
    anomalyZScore: number;
    manufacturingUtilizationDropPercent: number;
    confidenceDropPercent: number;
  };
  aiModels: {
    fastDeployment: string;
    reasoningDeployment: string;
    embeddingDeployment: string;
  };
  forecastHorizons: (1 | 7 | 30 | 90)[];
  riskThresholds: { medium: number; high: number; critical: number };
}

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [authorization, setAuthorization] = useState("");
  const [regions, setRegions] = useState("");
  const [recipients, setRecipients] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        return payload as {
          settings: AdminSettings;
          authorization: { source: string; principalId?: string };
        };
      })
      .then((payload) => {
        setSettings(payload.settings);
        setRegions(payload.settings.regions.join(", "));
        setRecipients(payload.settings.reportRecipients.join("\n"));
        setAuthorization(
          `${payload.authorization.source}${payload.authorization.principalId ? ` · ${payload.authorization.principalId}` : ""}`,
        );
      })
      .catch((error) => setMessage(error.message));
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setMessage("");
    const value = {
      ...settings,
      regions: regions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      reportRecipients: recipients
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    const payload = await response.json();
    setMessage(
      response.ok
        ? "Configuration saved. No credential values were stored or returned."
        : (payload.error ?? "Settings update failed."),
    );
    if (response.ok) setSettings(payload.settings);
    setBusy(false);
  }

  if (!settings) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-[var(--teal)]" />
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            {message || "Checking administrator authorization..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-[rgba(252,253,250,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              aria-label="Back to command centre"
              className="dora-floating-control grid size-9 place-items-center"
              href="/dashboard"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--teal)]">
                <Settings2 size={14} /> Authorized administration
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                DORA settings
              </h1>
            </div>
          </div>
          <button
            className="flex h-10 items-center gap-2 rounded-[8px] bg-[var(--navy)] px-4 text-xs font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={save}
            type="button"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <Save size={15} />
            )}
            Save
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4 text-xs">
          <span className="flex items-center gap-2 font-bold text-[var(--blue)]">
            <ShieldCheck size={15} /> Admin identity: {authorization}
          </span>
          <span>
            No secrets are displayed. Credential fields contain Key Vault secret
            names only.
          </span>
        </div>
        {message ? (
          <div className="mt-4 rounded-[8px] border border-[var(--teal-line)] bg-[var(--teal-soft)] p-3 text-xs">
            {message}
          </div>
        ) : null}

        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <SettingsSection
            icon={Target}
            title="Commodities & forecast horizons"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {settings.commodities.map((commodity, index) => (
                <label
                  className="flex items-center justify-between rounded-[7px] border border-[var(--line)] bg-white p-3 text-xs font-semibold"
                  key={commodity.id}
                >
                  {commodity.name}
                  <input
                    checked={commodity.enabled}
                    onChange={(event) => {
                      const commodities = [...settings.commodities];
                      commodities[index] = {
                        ...commodity,
                        enabled: event.target.checked,
                      };
                      setSettings({ ...settings, commodities });
                    }}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5">
              <Label>Forecast horizons</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {([1, 7, 30, 90] as const).map((horizon) => {
                  const active = settings.forecastHorizons.includes(horizon);
                  return (
                    <button
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)]"}`}
                      key={horizon}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          forecastHorizons: active
                            ? settings.forecastHorizons.filter(
                                (item) => item !== horizon,
                              )
                            : [...settings.forecastHorizons, horizon].sort(
                                (left, right) => left - right,
                              ),
                        })
                      }
                      type="button"
                    >
                      {horizon} day
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection icon={Map} title="Regions">
            <Label>Enabled regions</Label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm"
              onChange={(event) => setRegions(event.target.value)}
              value={regions}
            />
            <p className="mt-2 text-[10px] text-[var(--ink-faint)]">
              Comma-separated business regions.
            </p>
          </SettingsSection>

          <SettingsSection icon={Database} title="Providers & credentials">
            <div className="space-y-3">
              {Object.entries(settings.providers).map(([id, provider]) => (
                <div
                  className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_100px_1.4fr] sm:items-end"
                  key={id}
                >
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      checked={provider.enabled}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            [id]: {
                              ...provider,
                              enabled: event.target.checked,
                            },
                          },
                        })
                      }
                      type="checkbox"
                    />
                    {id}
                  </label>
                  <NumberInput
                    label="Refresh min"
                    max={43_200}
                    min={1}
                    onChange={(refreshMinutes) =>
                      setSettings({
                        ...settings,
                        providers: {
                          ...settings.providers,
                          [id]: { ...provider, refreshMinutes },
                        },
                      })
                    }
                    value={provider.refreshMinutes}
                  />
                  <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
                    <span className="flex items-center gap-1">
                      <KeyRound size={11} /> Key Vault secret name
                    </span>
                    <input
                      className="mt-1 h-9 w-full rounded-[7px] border border-[var(--line)] px-2 text-xs normal-case"
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            [id]: {
                              ...provider,
                              keyVaultSecretName:
                                event.target.value || undefined,
                            },
                          },
                        })
                      }
                      placeholder="No secret required"
                      value={provider.keyVaultSecretName ?? ""}
                    />
                  </label>
                </div>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection icon={CalendarClock} title="Schedules & reports">
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(settings.refreshSchedules).map(
                ([id, minutes]) => (
                  <NumberInput
                    key={id}
                    label={`${id} minutes`}
                    max={43_200}
                    min={1}
                    onChange={(value) =>
                      setSettings({
                        ...settings,
                        refreshSchedules: {
                          ...settings.refreshSchedules,
                          [id]: value,
                        },
                      })
                    }
                    value={minutes}
                  />
                ),
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TextInput
                label="Weekly day"
                onChange={(day) =>
                  setSettings({
                    ...settings,
                    weeklyReportSchedule: {
                      ...settings.weeklyReportSchedule,
                      day,
                    },
                  })
                }
                value={settings.weeklyReportSchedule.day}
              />
              <TextInput
                label="Local time"
                onChange={(localTime) =>
                  setSettings({
                    ...settings,
                    weeklyReportSchedule: {
                      ...settings.weeklyReportSchedule,
                      localTime,
                    },
                  })
                }
                type="time"
                value={settings.weeklyReportSchedule.localTime}
              />
              <TextInput
                label="Timezone"
                onChange={(timezone) =>
                  setSettings({
                    ...settings,
                    weeklyReportSchedule: {
                      ...settings.weeklyReportSchedule,
                      timezone,
                    },
                  })
                }
                value={settings.weeklyReportSchedule.timezone}
              />
            </div>
            <Label className="mt-5 block">Report recipients</Label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm"
              onChange={(event) => setRecipients(event.target.value)}
              placeholder="One authorized address per line"
              value={recipients}
            />
          </SettingsSection>

          <SettingsSection icon={BellRing} title="Alert & risk thresholds">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberInput
                label="Price movement %"
                min={0.1}
                onChange={(priceMovementPercent) =>
                  setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      priceMovementPercent,
                    },
                  })
                }
                value={settings.alertThresholds.priceMovementPercent}
              />
              <NumberInput
                label="Anomaly z-score"
                min={0.1}
                onChange={(anomalyZScore) =>
                  setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      anomalyZScore,
                    },
                  })
                }
                value={settings.alertThresholds.anomalyZScore}
              />
              <NumberInput
                label="Utilization drop %"
                min={0.1}
                onChange={(manufacturingUtilizationDropPercent) =>
                  setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      manufacturingUtilizationDropPercent,
                    },
                  })
                }
                value={
                  settings.alertThresholds.manufacturingUtilizationDropPercent
                }
              />
              {Object.entries(settings.riskThresholds).map(([level, value]) => (
                <NumberInput
                  key={level}
                  label={`${level} risk`}
                  max={1}
                  min={0}
                  onChange={(next) =>
                    setSettings({
                      ...settings,
                      riskThresholds: {
                        ...settings.riskThresholds,
                        [level]: next,
                      },
                    })
                  }
                  step={0.01}
                  value={value}
                />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection icon={Bot} title="AI deployment aliases">
            <p className="mb-4 text-xs leading-5 text-[var(--ink-muted)]">
              Deployment names are replaceable configuration. Model credentials
              remain server-side in Managed Identity or Key Vault.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput
                label="Fast deployment"
                onChange={(fastDeployment) =>
                  setSettings({
                    ...settings,
                    aiModels: { ...settings.aiModels, fastDeployment },
                  })
                }
                value={settings.aiModels.fastDeployment}
              />
              <TextInput
                label="Reasoning deployment"
                onChange={(reasoningDeployment) =>
                  setSettings({
                    ...settings,
                    aiModels: { ...settings.aiModels, reasoningDeployment },
                  })
                }
                value={settings.aiModels.reasoningDeployment}
              />
              <TextInput
                label="Embedding deployment"
                onChange={(embeddingDeployment) =>
                  setSettings({
                    ...settings,
                    aiModels: { ...settings.aiModels, embeddingDeployment },
                  })
                }
                value={settings.aiModels.embeddingDeployment}
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}

function SettingsSection({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: typeof Settings2;
  title: string;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-hairline)]">
      <div className="mb-5 flex items-center gap-2 text-sm font-bold text-[var(--navy)]">
        <Icon className="text-[var(--teal)]" size={16} /> {title}
      </div>
      {children}
    </section>
  );
}

function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[9px] font-bold uppercase text-[var(--ink-faint)] ${className}`}
    >
      {children}
    </span>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
      {label}
      <input
        className="mt-1 h-9 w-full rounded-[7px] border border-[var(--line)] bg-white px-2 text-xs"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
      {label}
      <input
        className="mt-1 h-9 w-full rounded-[7px] border border-[var(--line)] bg-white px-2 text-xs normal-case"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}
