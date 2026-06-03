"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImpersonationBannerProps {
  orgName: string;
}

export default function ImpersonationBanner({
  orgName,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExit() {
    setLoading(true);
    try {
      await fetch("/api/impersonate/exit", { method: "POST" });
      router.push("/admin/organizations");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="bg-yellow-500 text-black py-2 px-4 text-center flex items-center justify-center gap-4">
      <span className="font-medium">
        You are viewing as admin of {orgName}
      </span>
      <button
        onClick={handleExit}
        disabled={loading}
        className="rounded bg-black text-yellow-500 px-3 py-1 text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "Exiting..." : "Exit"}
      </button>
    </div>
  );
}
