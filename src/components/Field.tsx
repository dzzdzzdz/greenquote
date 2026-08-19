import type { InputHTMLAttributes } from "react";

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

/**
 * Label, input and error message as one unit, so the accessibility wiring is
 * written once rather than repeated on every form.
 */
export function Field({ name, label, error, hint, ...inputProps }: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>

      <input
        id={name}
        name={name}
        // Announces the field as invalid, and points the reader at the reason.
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`rounded-md border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-offset-1 ${
          error
            ? "border-red-700 focus:ring-red-700"
            : "border-neutral-400 focus:ring-neutral-700"
        }`}
        {...inputProps}
      />

      {hint ? (
        <p id={hintId} className="text-sm text-neutral-600">
          {hint}
        </p>
      ) : null}

      {error ? (
        // role="alert" so the message is spoken when it appears, not only when
        // the field is focused.
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
