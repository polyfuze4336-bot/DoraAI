import {
  describeLogicalSchedule,
  loadScheduleConfiguration,
} from "@dora/pipeline/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const configuration = loadScheduleConfiguration();
  return Response.json({
    timezone: configuration.timezone,
    dispatcher: configuration.containerAppsDispatcher,
    jobs: configuration.jobs.map((job) => ({
      ...job,
      logicalSchedule: describeLogicalSchedule(
        job.schedule,
        configuration.timezone,
      ),
    })),
  });
}
