"use client";

import {
  useActionState,
  useRef,
  useState,
  useTransition,
  type InputHTMLAttributes,
} from "react";
import Script from "next/script";
import { ArrowRight } from "lucide-react";

import { googleLogin, login, register } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              shape?: "rectangular" | "pill";
              size?: "small" | "medium" | "large";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
            }
          ): void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const FIELD_CLASS =
  "mt-2 h-20 w-full border-b-2 border-border bg-transparent px-4 text-2xl font-bold tracking-tight outline-none focus:border-accent aria-[invalid]:border-destructive aria-[invalid]:focus:border-accent md:h-24 md:text-4xl";

const LABEL_CLASS =
  "block px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [registerState, registerAction, registerPending] = useActionState(register, null);
  const [googleError, setGoogleError] = useState<string>();
  const [googlePending, startGoogle] = useTransition();
  const googleRef = useRef<HTMLDivElement>(null);

  const isRegister = mode === "register";
  const state = isRegister ? registerState : loginState;
  const pending = loginPending || registerPending || googlePending;
  const error = googleError ?? state?.error;
  const invalid = state ? true : undefined;

  function field(name: string, label: string, props: InputHTMLAttributes<HTMLInputElement>) {
    return (
      <div>
        <label htmlFor={name} className={LABEL_CLASS}>
          {label}
        </label>
        <input
          id={name}
          name={name}
          required
          aria-invalid={invalid}
          aria-describedby={error ? "login-error" : undefined}
          className={FIELD_CLASS}
          {...props}
        />
      </div>
    );
  }

  function initGoogle() {
    const google = window.google;
    if (!GOOGLE_CLIENT_ID || !googleRef.current || !google) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) =>
        startGoogle(async () => {
          // Resolves only on failure; on success the action redirects to /home.
          setGoogleError(await googleLogin(credential));
        }),
    });
    google.accounts.id.renderButton(googleRef.current, {
      theme: "outline",
      shape: "rectangular",
      size: "large",
      text: "continue_with",
      width: Math.min(400, Math.max(200, googleRef.current.offsetWidth)),
    });
  }

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
            <span className="inline-block bg-accent px-4 py-1 text-accent-foreground">
              {isRegister ? "Up" : "In"}
            </span>
            <br />
            To Issue
          </h1>
          <p className="mt-8 max-w-md text-lg leading-tight text-muted-foreground md:text-xl">
            The certificate console. Sign in, create an account, or continue
            with Google.
          </p>
        </div>

      </section>

      <section className="flex flex-1 flex-col justify-between p-6 md:p-10 lg:p-16">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-xl space-y-10 py-12">
          <form
            key={mode}
            action={isRegister ? registerAction : loginAction}
            onSubmit={() => setGoogleError(undefined)}
            className="space-y-10"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tighter uppercase md:text-6xl">
                {isRegister ? "Join" : "Access"}
              </h2>
              <p className="mt-3 text-base text-muted-foreground md:text-lg">
                {isRegister
                  ? "Create an account to start issuing certificates."
                  : "Use your username and password."}
              </p>
            </div>

            <fieldset disabled={pending} className="space-y-8 disabled:opacity-60">
              {isRegister &&
                field("name", "Full name", { type: "text", autoComplete: "name", autoFocus: true })}
              {field("username", "Username", {
                type: "text",
                autoComplete: "username",
                autoFocus: !isRegister,
                defaultValue: state?.username,
              })}
              {isRegister && field("email", "Email", { type: "email", autoComplete: "email" })}
              {field("password", "Password", {
                type: "password",
                autoComplete: isRegister ? "new-password" : "current-password",
                minLength: isRegister ? 8 : undefined,
              })}
              {isRegister &&
                field("confirmPassword", "Confirm password", {
                  type: "password",
                  autoComplete: "new-password",
                  minLength: 8,
                })}
            </fieldset>

            <p id="login-error" aria-live="polite" className="min-h-6">
              {error ? (
                <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
                  {error}
                </span>
              ) : null}
            </p>

            <Button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="h-14 w-full gap-3 text-base tracking-tighter transition-transform hover:scale-[1.02] active:scale-95 md:h-16 md:text-lg"
            >
              {pending
                ? isRegister ? "Creating account…" : "Signing in…"
                : isRegister ? "Create Account" : "Enter Console"}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="h-0.5 flex-1 bg-border" />
                <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  or
                </span>
                <span className="h-0.5 flex-1 bg-border" />
              </div>
              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={initGoogle}
              />
              <div ref={googleRef} className="flex min-h-11 w-full justify-center" />
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => {
                setGoogleError(undefined);
                setMode(isRegister ? "login" : "register");
              }}
              className="cursor-pointer font-bold tracking-widest uppercase underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>

        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Certifier Reloaded — demo build
        </p>
      </section>
    </div>
  );
}
