"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Button, TextField, ErrorText } from "@/components/ui/primitives";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName: fullName || undefined }),
      });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Start your system</h1>
        <p className="text-ink-muted mb-8 text-sm">A goal is only real once it becomes a task you actually did.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="Full name (optional)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            required
            minLength={10}
            hint="At least 10 characters, with a mix of upper/lowercase and a number."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-moss hover:text-moss-dark underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
