import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const appointmentJobSchema = z.object({
  jobName: z.string().min(1),
  appointmentId: z.string().min(1),
  clinicId: z.string().min(1),
  startedAt: z.string().datetime(),
  completed: z.boolean(),
  errorMessage: z.string().optional()
});

export type AppointmentJob = z.infer<typeof appointmentJobSchema>;

export interface ErrorCaptureClient {
  capture(payload: Record<string, unknown>): Promise<unknown>;
}

export function decideNotification(job: AppointmentJob): "notify-ops" | "record-success" {
  return job.completed ? "record-success" : "notify-ops";
}

export function capturePayload(job: AppointmentJob): Record<string, unknown> {
  return {
    title: `scheduled job ${job.jobName} failed`,
    message: job.errorMessage ?? "The appointment workflow did not complete",
    level: "error",
    fingerprint: ["appointment-workflow", job.jobName, job.clinicId],
    exception: job.errorMessage ?? "appointment workflow failure",
    context: {
      job_name: job.jobName,
      clinic_id: job.clinicId,
      appointment_id: job.appointmentId,
      started_at: job.startedAt,
      notification: "notify-ops"
    }
  };
}

export async function surfaceFailure(input: unknown, client: ErrorCaptureClient): Promise<string> {
  const job = appointmentJobSchema.parse(input);
  const decision = decideNotification(job);
  if (decision === "record-success") return decision;
  await client.capture(capturePayload(job));
  return decision;
}

if (process.argv[1]?.endsWith("job_visibility.ts")) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the remote demo");
  const sample = {
    jobName: "appointment-reminder",
    appointmentId: process.env.APPOINTMENT_ID ?? "appointment-from-operator",
    clinicId: process.env.CLINIC_ID ?? "clinic-from-operator",
    startedAt: new Date().toISOString(),
    completed: false,
    errorMessage: "Reminder delivery was not acknowledged"
  };
  const infrai = { errors: { capture: (payload: Record<string, unknown>) => new InfraiClient(key).capture(payload) } };
  void infrai.errors.capture(capturePayload(appointmentJobSchema.parse(sample)))
    .then(() => console.log("scheduled job failure surfaced; notification decision: notify-ops"));
}
