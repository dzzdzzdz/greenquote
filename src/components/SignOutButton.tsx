"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The only interactive part of the header, so the boundary sits here. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });

    router.push("/login");
    // Server components rendered with the old session must render again.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="text-sm underline disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
