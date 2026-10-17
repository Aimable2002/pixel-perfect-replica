/**
 * Integration point for the EXISTING external payment backend (PayPack is handled there).
 *
 * TODO: Replace the simulated bodies below with real HTTP calls once the backend exists.
 *   - Read the base URL / credentials from server env, e.g. process.env["PAYMENT_BACKEND_URL"].
 *   - Do not add payment-provider logic here; this file only talks to that backend.
 *
 * SIMULATION (development only): initiation resolves after a short setTimeout,
 * and status turns "success" ~10 seconds after initiation.
 */

export type BackendStatus = "pending" | "success" | "failed" | "cancelled";

export type InitiateRequest = {
  paymentId: string;
  amount: number;
  currency: "RWF";
  phone: string;
  description: string;
};

export type InitiateResponse = {
  reference: string;
  instructions: string;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function initiatePayment(req: InitiateRequest): Promise<InitiateResponse> {
  // TODO: POST `${process.env["PAYMENT_BACKEND_URL"]}/...` with req
  await delay(800);
  return {
    reference: `SIM-${Date.now()}-${req.paymentId.slice(0, 8)}`,
    instructions: `A payment request of ${req.amount} RWF was sent to ${req.phone}. Approve it on your phone to continue. (Simulated — confirms automatically in ~10 seconds.)`,
  };
}

export async function getPaymentStatus(reference: string): Promise<BackendStatus> {
  // TODO: GET `${process.env["PAYMENT_BACKEND_URL"]}/.../${reference}`
  await delay(400);
  const ts = Number(reference.split("-")[1]);
  if (!ts) return "failed";
  return Date.now() - ts > 10_000 ? "success" : "pending";
}
