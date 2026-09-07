"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/utils/apiFetch";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/goals", label: "Goals" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-rule">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg">
          Execution System
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname?.startsWith(l.href) ? "text-moss" : "text-ink-muted hover:text-ink"}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="text-ink-muted hover:text-clay">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
