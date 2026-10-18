import type { Metadata } from "next";
import { Ban, BadgeCheck, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { verifyCertificate, type VerifiedCertificate } from "@/src/client";

export const metadata: Metadata = { title: "Verify a certificate · Certifier" };

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const LABEL = "text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", DAY) : null);

/**
 * Public: no login. A Verify QR opens /verify?code=…, and a typed code submits the
 * same GET form, so both land on the same URL.
 */
export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const raw = (await searchParams).code;
  const code = (typeof raw === "string" ? raw : "").trim();

  let certificate: VerifiedCertificate | undefined;
  let error: string | undefined;
  if (code) {
    try {
      const result = await verifyCertificate({ path: { code } });
      certificate = result.data;
      if (!certificate) {
        const { msg } = (result.error ?? {}) as { msg?: unknown };
        error = typeof msg === "string" ? msg : "Couldn't check this code. Try again.";
      }
    } catch {
      error = "Can't reach the server. Try again in a moment.";
    }
  }
  const revoked = certificate?.issue_status === "revoked";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b-2 border-border px-6 py-4 md:px-10">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 md:py-16">
        <h1 className="text-3xl leading-[0.9] font-bold tracking-tighter uppercase md:text-5xl">
          Verify a certificate
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Scan the QR code on the certificate, or type the code printed on it.
        </p>

        <form action="/verify" className="mt-8 flex gap-2">
          <label htmlFor="code" className="sr-only">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            required
            defaultValue={code}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX"
            className="h-12 min-w-0 flex-1 border-2 border-border bg-transparent px-4 font-mono text-lg font-bold tracking-widest uppercase outline-none focus:border-accent"
          />
          <Button type="submit" className="h-12 px-5">
            <Search className="size-4" aria-hidden="true" />
            Check
          </Button>
        </form>

        {error ? (
          <p role="alert" className="mt-8 border-2 border-destructive p-4 text-sm font-bold text-destructive">
            {error}
          </p>
        ) : null}

        {certificate ? (
          <section
            aria-live="polite"
            className={cn("mt-8 border-2", revoked ? "border-destructive" : "border-accent")}
          >
            <p
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-bold tracking-widest uppercase",
                revoked ? "bg-destructive text-background" : "bg-accent text-accent-foreground"
              )}
            >
              {revoked ? <Ban className="size-4" aria-hidden="true" /> : <BadgeCheck className="size-4" aria-hidden="true" />}
              {revoked ? "Revoked certificate" : "Valid certificate"}
            </p>
            <dl className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:gap-x-8">
              {[
                ["Issued to", certificate.recipient_name],
                ["Certificate", certificate.template_name],
                ["Issued by", certificate.issuer_name],
                ["Issued on", day(certificate.issued_at)],
                ["Revoked on", revoked ? day(certificate.revoked_at) : null],
                ["Code", certificate.code],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className={cn(LABEL, "sm:pt-1")}>{label}</dt>
                    <dd suppressHydrationWarning className="-mt-3 text-lg font-bold tracking-tight break-words sm:mt-0">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
            {revoked ? (
              <p className="border-t-2 border-destructive px-4 py-3 text-sm text-muted-foreground">
                The issuer has withdrawn this certificate. It is no longer valid.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
