"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type InputHTMLAttributes,
} from "react";
import Script from "next/script";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { googleLogin, login, register } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader } from "@/components/loader";
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
  "mt-2 h-[clamp(2.5rem,6.5dvh,5.5rem)] w-full min-w-0 border-b-2 border-border bg-transparent px-4 text-[clamp(1.125rem,3.2dvh,2.25rem)] font-bold tracking-tight outline-none focus:border-accent aria-[invalid]:border-destructive aria-[invalid]:focus:border-accent";

// The page is locked to one viewport, so vertical rhythm scales with its height.
const STACK = "space-y-[clamp(0.75rem,3dvh,2.5rem)]";

const LABEL_CLASS =
  "block px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [registerState, registerAction, registerPending] = useActionState(register, null);
  const [googlePending, startGoogle] = useTransition();
  const googleRef = useRef<HTMLDivElement>(null);

  const isRegister = mode === "register";
  const state = isRegister ? registerState : loginState;
  const pending = loginPending || registerPending || googlePending;
  const invalid = state ? true : undefined;

  // Each failed attempt returns a fresh state object, so a repeated mistake toasts again.
  // Success never lands here: the action redirects to /home with its own toast.
  useEffect(() => {
    if (loginState?.error) toast.error(loginState.error);
  }, [loginState]);
  useEffect(() => {
    if (registerState?.error) toast.error(registerState.error);
  }, [registerState]);

  function field(
    name: string,
    label: string,
    props: InputHTMLAttributes<HTMLInputElement>,
    className?: string
  ) {
    return (
      <div className={className}>
        <label htmlFor={name} className={LABEL_CLASS}>
          {label}
        </label>
        <input
          id={name}
          name={name}
          required
          aria-invalid={invalid}
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
          toast.error(await googleLogin(credential));
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
    <div className="relative flex h-dvh flex-col overflow-hidden lg:flex-row">
      <div className="absolute top-1.5 right-6 z-10 md:top-6.5 md:right-10">
        <ThemeToggle />
      </div>

      <section className="flex shrink-0 flex-col border-b-2 border-border lg:w-[55%] lg:border-r-2 lg:border-b-0">
        <div className="flex h-14 shrink-0 items-center px-6 md:h-24 md:px-10">
          <Wordmark />
        </div>

        {/* On phones the form's own heading carries the page, so the poster is desktop-only. */}
        <div className="flex flex-1 flex-col justify-center px-6 pb-24 max-lg:hidden md:px-10">
          <h1 className="text-[clamp(3rem,min(9vw,17dvh),11rem)] leading-[0.8] font-bold tracking-tighter uppercase">
            <span className="rise block">Sign</span>
            <span className="rise block [animation-delay:60ms]">
              {/* Keyed so the swap remounts and .reveal wipes the new word in. */}
              <span
                key={mode}
                className="reveal inline-block bg-accent px-4 py-1 text-accent-foreground"
              >
                {isRegister ? "Up" : "In"}
              </span>
            </span>
            <span className="rise block [animation-delay:120ms]">To Issue</span>
          </h1>
          <p className="rise mt-[clamp(1rem,4dvh,2rem)] max-w-md text-lg leading-tight text-muted-foreground [animation-delay:180ms] md:text-xl">
            One design, one CSV, one certificate per row.
          </p>
        </div>
      </section>

      {/* overflow-y-auto is only a fallback for tiny screens or an open keyboard. */}
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 md:px-10 lg:px-16">
        <div className={`mx-auto my-auto w-full max-w-xl py-[clamp(0.75rem,4dvh,3rem)] ${STACK}`}>
          <form
            key={mode}
            action={isRegister ? registerAction : loginAction}
            className={`fade-swap ${STACK}`}
          >
            <div>
              <h2 className="text-[clamp(2rem,6dvh,3.75rem)] leading-none font-bold tracking-tighter uppercase">
                {isRegister ? "Join" : "Access"}
              </h2>
              <p className="mt-3 text-base text-muted-foreground md:text-lg [@media(max-height:700px)]:hidden">
                {isRegister
                  ? "Create an account to start issuing certificates."
                  : "Use your username and password."}
              </p>
            </div>

            {/* Sign-up pairs its fields two to a row so five fit where login's two do. */}
            <fieldset
              disabled={pending}
              className="grid grid-cols-2 items-end gap-x-4 gap-y-[clamp(0.75rem,2.5dvh,2rem)] disabled:opacity-60"
            >
              {isRegister &&
                field("name", "Full name", { type: "text", autoComplete: "name", autoFocus: true })}
              {field("username", "Username", {
                type: "text",
                autoComplete: "username",
                autoFocus: !isRegister,
                defaultValue: state?.username,
              }, isRegister ? undefined : "col-span-2")}
              {isRegister &&
                field("email", "Email", { type: "email", autoComplete: "email" }, "col-span-2")}
              {field("password", "Password", {
                type: "password",
                autoComplete: isRegister ? "new-password" : "current-password",
                minLength: isRegister ? 8 : undefined,
              }, isRegister ? undefined : "col-span-2")}
              {isRegister &&
                field("confirmPassword", "Confirm password", {
                  type: "password",
                  autoComplete: "new-password",
                  minLength: 8,
                })}
            </fieldset>

            <Button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="h-12 w-full gap-3 text-base tracking-tighter md:h-14 md:text-lg"
            >
              {pending
                ? isRegister ? "Creating account…" : "Signing in…"
                : isRegister ? "Create account" : "Sign in"}
              {pending ? <Loader /> : <ArrowRight className="size-5" aria-hidden="true" />}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="space-y-[clamp(0.75rem,2dvh,1.5rem)]">
              <div className="flex items-center gap-4 [@media(max-height:600px)]:hidden">
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
              onClick={() => setMode(isRegister ? "login" : "register")}
              className="cursor-pointer font-bold tracking-widest uppercase underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
