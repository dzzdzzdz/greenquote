"use client";

/**
 * Opens the browser's print dialog, where "Save as PDF" is a destination on
 * every major platform. The print stylesheet decides what the page looks like
 * there.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-neutral-400 px-4 py-2 text-sm print:hidden"
    >
      Download as PDF
    </button>
  );
}
