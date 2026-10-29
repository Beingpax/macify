"use client";

import { useState, type FormEvent } from "react";
import { markSubscribed } from "./subscription-state";
import { ArrowRight, Check } from "lucide-react";
import { z } from "zod";

const signupResponseSchema = z.object({
  status: z.string(),
  errors: z.object({ messages: z.array(z.string()).optional() }).optional(),
});

export function SignupForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const id = compact ? "banner-email" : "black-friday-email";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("host", window.location.href);
    body.set("referrer", document.referrer);
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch(form.action, {
        method: "POST", body, headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("request failed");
      const result = signupResponseSchema.parse(await response.json());
      if (result.status !== "success") {
        const errors = result.errors?.messages;
        setMessage(errors && errors.length > 0
          ? errors.join(" ") : "Kit couldn’t complete your signup. Please try again or use the signup link below.");
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
      markSubscribed();
    } catch {
      setStatus("error");
      setMessage("We couldn’t reach Kit. Please try again or use the signup link below.");
    }
  }

  if (status === "success") {
    return compact ? null : (
      <div className="black-friday-subscribed" role="status">
        <span className="black-friday-subscribed-icon"><Check size={22} aria-hidden="true" /></span>
        <div><strong>You’re on the list.</strong><p>We’ll email you when our Black Friday deal roundup is ready.</p></div>
      </div>
    );
  }

  return (
    <form action="https://app.kit.com/forms/10113304/subscriptions" method="post" onSubmit={submit} className={compact ? "black-friday-banner-form" : "black-friday-form"} aria-busy={status === "sending"}>
      <label className={compact ? "black-friday-banner-email-label" : undefined} htmlFor={id}>Your email address</label>
      <div className="black-friday-form-row">
        <input id={id} name="email_address" type="email" placeholder={compact ? "Your email address" : "you@example.com"} autoComplete="email" required disabled={status === "sending"} />
        <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Signing up…" : "Notify me"}<ArrowRight size={18} aria-hidden="true" /></button>
      </div>
      {message && <p className="signup-feedback" role="alert">{message} <> <a href="https://macify-account.kit.com/8874b5f532">Sign up on our backup page</a></></p>}
      {!compact && <p>Unsubscribe anytime.</p>}
    </form>
  );
}
