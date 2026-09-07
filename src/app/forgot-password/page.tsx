"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Button, TextField } from "@/components/ui/primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Reset your password</h1>
        {sent ? (
          <p className="text-ink-muted text-sm mt-4">
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 mt-8">
            <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-moss hover:text-moss-dark underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
