import { QuoteForm } from "@/components/QuoteForm";
import { requirePageUser } from "@/lib/auth/guard";

export default async function NewQuotePage() {
  // Resolved on the server, so the prefilled values are in the first response
  // rather than appearing after a client-side lookup.
  const user = await requirePageUser();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="mb-6 text-2xl font-semibold">Get a pre-qualification</h1>
      <QuoteForm defaultFullName={user.fullName} defaultEmail={user.email} />
    </main>
  );
}
