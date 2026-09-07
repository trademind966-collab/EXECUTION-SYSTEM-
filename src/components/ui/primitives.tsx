import { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const base = "inline-flex items-center justify-center px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-moss text-paper hover:bg-moss-dark",
    quiet: "border border-rule text-ink hover:border-ink",
    danger: "border border-clay text-clay hover:bg-clay hover:text-paper",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }>(
  function TextField({ label, hint, className = "", ...props }, ref) {
    return (
      <label className="block">
        {label && <span className="block text-sm text-ink-muted mb-1">{label}</span>}
        <input
          ref={ref}
          className={`w-full border border-rule bg-card px-3 py-2 text-ink focus:outline-none focus:border-moss ${className}`}
          {...props}
        />
        {hint && <span className="block text-xs text-ink-muted mt-1">{hint}</span>}
      </label>
    );
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }>(
  function TextArea({ label, hint, className = "", ...props }, ref) {
    return (
      <label className="block">
        {label && <span className="block text-sm text-ink-muted mb-1">{label}</span>}
        <textarea
          ref={ref}
          className={`w-full border border-rule bg-card px-3 py-2 text-ink focus:outline-none focus:border-moss ${className}`}
          {...props}
        />
        {hint && <span className="block text-xs text-ink-muted mt-1">{hint}</span>}
      </label>
    );
  }
);

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-rule bg-card p-6 ${className}`}>{children}</div>;
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="text-sm text-clay">{children}</p>;
}
