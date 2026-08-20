import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { SignOutButton } from "./SignOutButton";

/**
 * A server component, so the signed-in name is in the first HTML response
 * rather than appearing after a client-side fetch.
 */
export async function SiteHeader() {
  const user = await readSession();

  return (
    <header className="border-b border-neutral-200 print:hidden">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 p-4"
      >
        <Link href="/" className="font-semibold">
          GreenQuote
        </Link>

        {user ? (
          <>
            <Link href="/quotes" className="text-sm underline">
              My quotes
            </Link>
            <Link href="/quotes/new" className="text-sm underline">
              New quote
            </Link>
            {/* Hiding this is presentation. The admin page checks the role
                itself, and so does the API. */}
            {user.role === "ADMIN" ? (
              <Link href="/admin/quotes" className="text-sm underline">
                All quotes
              </Link>
            ) : null}

            <span className="ml-auto text-sm text-neutral-600">
              {user.fullName}
            </span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="ml-auto text-sm underline">
              Sign in
            </Link>
            <Link href="/register" className="text-sm underline">
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
