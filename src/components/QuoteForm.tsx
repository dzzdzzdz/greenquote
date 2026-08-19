"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/Field";
import { eurosToCents } from "@/lib/money";
import { quoteInputSchema } from "@/lib/validation";

type FieldName =
  | "fullName"
  | "email"
  | "address"
  | "monthlyConsumptionKwh"
  | "systemSizeKw"
  | "downPayment";

/**
 * Every value is held as a string. An <input> always reports a string, and an
 * empty numeric field reports "", so conversion happens once at submit rather
 * than on every keystroke.
 */
type FormValues = Record<FieldName, string>;

export function QuoteForm({
  defaultFullName,
  defaultEmail,
}: {
  defaultFullName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({
    fullName: defaultFullName,
    email: defaultEmail,
    address: "",
    monthlyConsumptionKwh: "",
    systemSizeKw: "",
    downPayment: "",
  });
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

    const payload = {
      fullName: values.fullName,
      email: values.email,
      address: values.address,
      monthlyConsumptionKwh: Number(values.monthlyConsumptionKwh),
      systemSizeKw: Number(values.systemSizeKw),
      // People type euros. The API and the database speak cents.
      downPaymentCents: values.downPayment
        ? eurosToCents(Number(values.downPayment))
        : undefined,
    };

    const parsed = quoteInputSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        // The API field is downPaymentCents; the input is called downPayment.
        const name = (
          field === "downPaymentCents" ? "downPayment" : field
        ) as FieldName;
        errors[name] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body = await response.json();

      if (!response.ok) {
        if (body.error?.code === "INVALID_INPUT") {
          setFieldErrors({ downPayment: body.error.message });
        } else {
          setFormError(body.error?.message ?? "Something went wrong");
        }
        return;
      }

      router.push(`/quotes/${body.quote.id}`);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
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
        name="fullName"
        label="Full name"
        autoComplete="name"
        value={values.fullName}
        error={fieldErrors.fullName}
        onChange={(event) => update("fullName", event.target.value)}
      />

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
        name="address"
        label="Installation address"
        autoComplete="street-address"
        value={values.address}
        error={fieldErrors.address}
        onChange={(event) => update("address", event.target.value)}
      />

      <Field
        name="monthlyConsumptionKwh"
        label="Monthly consumption (kWh)"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        hint="From a recent electricity bill."
        value={values.monthlyConsumptionKwh}
        error={fieldErrors.monthlyConsumptionKwh}
        onChange={(event) =>
          update("monthlyConsumptionKwh", event.target.value)
        }
      />

      <Field
        name="systemSizeKw"
        label="System size (kW)"
        type="number"
        inputMode="decimal"
        min={0.1}
        step={0.1}
        value={values.systemSizeKw}
        error={fieldErrors.systemSizeKw}
        onChange={(event) => update("systemSizeKw", event.target.value)}
      />

      <Field
        name="downPayment"
        label="Down payment (EUR, optional)"
        type="number"
        inputMode="decimal"
        min={0}
        step={0.01}
        hint="Leave blank to finance the whole system."
        value={values.downPayment}
        error={fieldErrors.downPayment}
        onChange={(event) => update("downPayment", event.target.value)}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Calculating…" : "Get pre-qualification"}
      </button>
    </form>
  );
}
