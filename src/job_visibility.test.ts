import assert from "node:assert/strict";
import { decideNotification, surfaceFailure } from "./job_visibility.ts";

const failedJob = {
  jobName: "appointment-reminder",
  appointmentId: "appt-1001",
  clinicId: "clinic-7",
  startedAt: "2026-10-25T08:00:00.000Z",
  completed: false,
  errorMessage: "Reminder delivery was not acknowledged"
};

assert.equal(decideNotification(failedJob), "notify-ops");
assert.equal(await surfaceFailure({ ...failedJob, completed: true }, { capture: async () => undefined }), "record-success");
console.log("job decision test passed");
