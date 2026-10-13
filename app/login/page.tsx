"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import { login } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";

const FIELD_CLASS =
  "mt-2 h-20 w-full border-b-2 border-border bg-transparent px-4 text-2xl font-bold tracking-tight outline-none focus:border-accent aria-[invalid]:border-destructive aria-[invalid]:focus:border-accent md:h-24 md:text-4xl";

const LABEL_CLASS =
  "block px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);
  const invalid = state ? true : undefined;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <section className="relative flex flex-col justify-between overflow-hidden border-b-2 border-border lg:w-[55%] lg:border-r-2 lg:border-b-0">
        <div className="flex items-center justify-between p-6 md:p-10">
          <Wordmark />
          <span className="text-xs tracking-widest text-muted-foreground uppercase md:text-sm">
            Demo build
          </span>
        </div>

        <div className="relative px-6 py-16 md:px-10 md:py-24">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 right-4 text-[8rem] leading-none font-bold text-muted select-none md:text-[12rem]"
          >
            01
          </span>
          <h1 className="relative text-[clamp(3rem,12vw,11rem)] leading-[0.8] font-bold tracking-tighter uppercase">
            Sign
            <br />
            <span className="inline-block bg-accent px-4 py-1 text-accent-foreground">In</span>
            <br />
            To Issue
          </h1>
          <p className="mt-8 max-w-md text-lg leading-tight text-muted-foreground md:text-xl">
            The certificate console. Sign in with the account your administrator
            issued you.
          </p>
        </div>

      </section>

      <section className="flex flex-1 flex-col justify-between p-6 md:p-10 lg:p-16">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <form action={formAction} className="mx-auto w-full max-w-xl space-y-10 py-12">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter uppercase md:text-6xl">
              Access
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Use the credentials your administrator issued you.
            </p>
          </div>

          <fieldset disabled={pending} className="space-y-8 disabled:opacity-60">
            <div>
              <label htmlFor="username" className={LABEL_CLASS}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                defaultValue={state?.username}
                aria-invalid={invalid}
                aria-describedby={state ? "login-error" : undefined}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL_CLASS}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={invalid}
                aria-describedby={state ? "login-error" : undefined}
                className={FIELD_CLASS}
              />
            </div>
          </fieldset>

          <p id="login-error" aria-live="polite" className="min-h-6">
            {state ? (
              <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
                {state.error}
              </span>
            ) : null}
          </p>

          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="h-14 w-full gap-3 text-base tracking-tighter transition-transform hover:scale-[1.02] active:scale-95 md:h-16 md:text-lg"
          >
            {pending ? "Signing in…" : "Enter Console"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </form>

        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Certifier Reloaded — demo build
        </p>
      </section>
    </div>
  );
}
