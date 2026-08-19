import Link from "next/link";
import { readSession } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await readSession();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">GreenQuote</h1>
        <p className="mt-2 text-neutral-600">
          Pre-qualification for residential solar financing. Tell us the system
          size and your monthly consumption, and see the price, your risk band
          and three instalment offers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={user ? "/quotes/new" : "/register"}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          {user ? "Get a quote" : "Create an account"}
        </Link>
        {user ? null : (
          <Link
            href="/login"
            className="rounded-md border border-neutral-400 px-4 py-2"
          >
            Sign in
          </Link>
        )}
      </div>

      <p className="text-sm text-neutral-600">
        Building against the API?{" "}
        <Link href="/docs" className="underline">
          Read the API documentation
        </Link>
        .
      </p>
    </main>
  );
}
