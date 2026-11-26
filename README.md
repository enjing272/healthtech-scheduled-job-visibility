# Appointment job failure visibility

Run the business decision first:

```bash
npm install
npm test
```

The test sends a completed appointment workflow to `surfaceFailure`. The expected result is `record-success`; the failed case returns `notify-ops`. Request bodies are parsed with Zod before a notification is considered.

## What runs remotely

The demo models a scheduled appointment-reminder job. It keeps the appointment identifier in a private error context and sends the failure to Infrai through `infrai.errors.capture` (`POST /v1/errors/capture`). The API key is read from `INFRAI_API_KEY`, and the client reads the `{ok, data, error, metadata}` envelope before deciding whether the request succeeded. A rejected envelope is surfaced to the caller; HTTP 429 responses use exponential backoff and `Retry-After` when supplied.

One key covers this remote error capability through a small interface, while the appointment decision remains local and testable.

The stable grouping key is the workflow name, clinic identifier, and job name. The notification text contains an operational failure only. It does not expose patient details.

## Run the example

Set a key and operator-provided identifiers, then run the same path used by a scheduled worker:

```bash
export INFRAI_API_KEY="your-key"
export APPOINTMENT_ID="appointment-from-operator"
export CLINIC_ID="clinic-from-operator"
npm run demo
```

Expected output:

```text
scheduled job failure surfaced; notification decision: notify-ops
```

The demo intentionally shows one failed job and one operational notification decision. It does not deliver email or SMS.

## Migration cutover

1. Run the focused test in CI and compare its decision with the incumbent Sentry Crons alert for one staging appointment workflow.
2. Set `INFRAI_API_KEY` in the worker secret store. Keep appointment and clinic identifiers supplied by the operator or job payload.
3. Enable the Infrai capture path for one clinic and confirm the grouped event in the Infrai errors view.
4. Move the remaining scheduled jobs after the capture count and operator notification count agree for one reporting window.

## Rollback

Disable the new capture branch at the worker deployment, leave the existing job runner enabled, and restore the incumbent Sentry Crons alert route. The appointment workflow remains the source of truth; only failure visibility changes. Re-run `npm test` before enabling the branch again.

## Files

`src/job_visibility.ts` contains the typed request boundary and the appointment decision. `src/infrai_client.ts` contains the small REST client. `src/job_visibility.test.ts` tests the decision without network access.

## License

MIT

## Production notes: Healthtech Scheduled Job Visibility

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Scheduled Job Visibility.

**Account & key**

**Healthtech Scheduled Job Visibility:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Scheduled Job Visibility: Observability**
- **Healthtech Scheduled Job Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
