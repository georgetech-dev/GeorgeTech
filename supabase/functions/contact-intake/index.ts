import { createClient } from "npm:@supabase/supabase-js@2";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "contact";
const ALLOWED_ORIGINS = new Set([
  "https://georgetech.uk",
  "https://www.georgetech.uk",
]);
const ALLOWED_HOSTNAMES = new Set([
  "georgetech.uk",
  "www.georgetech.uk",
]);

type ContactPayload = {
  name?: unknown;
  business?: unknown;
  email?: unknown;
  phone?: unknown;
  preferred_contact?: unknown;
  preferred_time?: unknown;
  reason?: unknown;
  message?: unknown;
  privacy_acknowledged?: unknown;
  turnstile_token?: unknown;
};

type TurnstileResult = {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

const asText = (value: unknown) => typeof value === "string" ? value.trim() : "";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const jsonResponse = (body: Record<string, unknown>, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const validLength = (value: string, minimum: number, maximum: number) =>
  value.length >= minimum && value.length <= maximum;

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 20_000) {
    return jsonResponse({ error: "Request too large" }, 413, origin);
  }

  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400, origin);
  }

  const token = asText(payload.turnstile_token);
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (!turnstileSecret) {
    console.error("TURNSTILE_SECRET is not configured");
    return jsonResponse({ error: "Service unavailable" }, 503, origin);
  }
  if (!token || token.length > 2_048) {
    return jsonResponse({ error: "Security verification required" }, 400, origin);
  }

  const verificationBody = new URLSearchParams({
    secret: turnstileSecret,
    response: token,
  });
  const remoteIp = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (remoteIp) verificationBody.set("remoteip", remoteIp);

  let verification: TurnstileResult;
  try {
    const verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationBody,
    });
    verification = await verificationResponse.json();
  } catch (error) {
    console.error("Turnstile verification request failed", error);
    return jsonResponse({ error: "Security verification unavailable" }, 503, origin);
  }

  if (
    !verification.success ||
    verification.action !== EXPECTED_ACTION ||
    !verification.hostname ||
    !ALLOWED_HOSTNAMES.has(verification.hostname)
  ) {
    console.warn("Turnstile verification rejected", {
      action: verification.action,
      hostname: verification.hostname,
      errorCodes: verification["error-codes"],
    });
    return jsonResponse({ error: "Security verification failed" }, 400, origin);
  }

  const name = asText(payload.name);
  const business = asText(payload.business);
  const email = asText(payload.email);
  const phone = asText(payload.phone);
  const preferredContact = asText(payload.preferred_contact);
  const preferredTime = asText(payload.preferred_time);
  const reason = asText(payload.reason);
  const message = asText(payload.message);
  const contactMethods = new Set(["email", "phone", "either"]);
  const hasRequiredContact =
    (preferredContact === "email" && validLength(email, 4, 254)) ||
    (preferredContact === "phone" && validLength(phone, 6, 40)) ||
    (preferredContact === "either" && (validLength(email, 4, 254) || validLength(phone, 6, 40)));

  if (
    !validLength(name, 1, 120) ||
    business.length > 160 ||
    email.length > 254 ||
    phone.length > 40 ||
    !contactMethods.has(preferredContact) ||
    !hasRequiredContact ||
    preferredTime.length > 120 ||
    !validLength(reason, 1, 160) ||
    !validLength(message, 1, 4_000) ||
    payload.privacy_acknowledged !== true
  ) {
    return jsonResponse({ error: "Please check the form details" }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase server credentials are unavailable");
    return jsonResponse({ error: "Service unavailable" }, 503, origin);
  }

  const reference = `GTQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("contact_requests").insert({
    reference,
    name,
    business: business || null,
    email: email || null,
    phone: phone || null,
    preferred_contact: preferredContact,
    preferred_time: preferredTime || null,
    reason,
    message,
    privacy_acknowledged: true,
    status: "new",
  });

  if (error) {
    console.error("Contact request insert failed", error);
    return jsonResponse({ error: "Enquiry could not be saved" }, 500, origin);
  }

  return jsonResponse({ reference }, 201, origin);
});
