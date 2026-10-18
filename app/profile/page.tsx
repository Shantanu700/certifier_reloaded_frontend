import { redirect } from "next/navigation";

import { resendVerification } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
import { SubmitButton } from "@/components/submit-button";
import { requireSession, sessionHeader } from "@/lib/session";
import { retrieveProfile } from "@/src/client";

const HEADING = "text-xs font-bold tracking-widest text-muted-foreground uppercase";

export default async function ProfilePage() {
  // The profile carries role, email and its verification, so no separate who-am-I call.
  const { sessionId } = await requireSession();
  const result = await retrieveProfile({ headers: sessionHeader(sessionId) }).catch(() => null);
  if (result?.response?.status === 401) redirect("/login");
  const profile = result?.data;
  const recipient = profile?.role === "recipient";

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader crumb="Profile" role={profile?.role} />

      <section className="border-b-2 border-border px-6 py-6 md:px-10">
        <h1 className="text-3xl leading-[0.9] font-bold tracking-tighter uppercase md:text-5xl">Profile</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          {recipient
            ? "Issuers match their lists against these details to send you certificates. Only your name, email, roll number and institution are shown to them."
            : "Signed in as an issuer."}
        </p>
      </section>

      <main className="grid flex-1 gap-10 px-6 py-8 md:px-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className={HEADING}>
            Your details
          </h2>
          <div className="mt-5">
            {profile ? (
              <ProfileForm profile={profile} />
            ) : (
              <p role="alert" className="text-sm text-destructive">
                Couldn&apos;t load your profile. Reload to try again.
              </p>
            )}
          </div>
        </section>

        {profile ? (
        <section aria-labelledby="email-heading" className="border-t-2 border-border pt-6 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-10">
          <h2 id="email-heading" className={HEADING}>
            Email
          </h2>
          <p className="mt-3 text-base font-bold break-all">{profile.email || "No email on file"}</p>
          {profile.email_verified ? (
            <p className="mt-2 inline-block bg-accent px-2 py-1 text-[0.6875rem] font-bold tracking-widest text-accent-foreground uppercase">
              Verified
            </p>
          ) : (
            <form action={resendVerification} className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Not verified yet.{recipient ? " Issuers can only send certificates to verified accounts." : null} Open
                the link we emailed you, or get a new one.
              </p>
              <SubmitButton variant="outline" pendingLabel="Sending…" className="h-11 border-2">
                Resend verification email
              </SubmitButton>
            </form>
          )}
        </section>
        ) : null}
      </main>
    </div>
  );
}
