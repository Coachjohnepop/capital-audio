"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.push("/admin");
    else setError("Wrong password.");
  };

  return (
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="font-display text-2xl font-semibold text-white">Studio login</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
          className="w-full rounded-lg border border-ca-border bg-ca-panel px-4 py-3 text-sm text-white focus:border-ca-gold"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-full bg-ca-gold px-5 py-3 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light disabled:opacity-40"
        >
          {busy ? "Checking…" : "Enter studio"}
        </button>
      </form>
    </div>
  );
}
