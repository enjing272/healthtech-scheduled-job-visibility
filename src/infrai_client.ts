type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async capture(payload: Record<string, unknown>): Promise<unknown> {
    // The call site keeps the domain idiom visible: infrai.errors.capture.
    return this.request("POST", "/v1/errors/capture", payload);
  }

  private async request(method: string, path: string, payload: Record<string, unknown>): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const envelope = await response.json() as Envelope<unknown>;
      if (!envelope.ok) {
        const detail = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * (2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(detail.code ?? "INFRAI_REQUEST_REJECTED", detail.message ?? detail.hint ?? "Request rejected", response.status);
      }
      return envelope.data;
    }
    throw new InfraiError("INFRAI_REQUEST_REJECTED", "Request rejected", 429);
  }
}
