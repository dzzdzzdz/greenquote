"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/Field";
import { loginSchema } from "@/lib/validation";

type FieldName = "email" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    // The same schema the API uses, run here purely to save a round trip.
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json();
        setFormError(body.error?.message ?? "Something went wrong");
        return;
      }

      router.push("/quotes");
      // Server components cached from before sign-in must render again.
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm flex-1 p-6">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        ) : null}

        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={fieldErrors.email}
          onChange={(event) => update("email", event.target.value)}
        />

        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={fieldErrors.password}
          onChange={(event) => update("password", event.target.value)}
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm">
        No account?{" "}
        <Link href="/register" className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
