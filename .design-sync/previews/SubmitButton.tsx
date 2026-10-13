import { SubmitButton } from "certifier_reloaded_frontend";

// SubmitButton reads useFormStatus, so it must sit inside a <form>. The pending
// label only appears while that form's action is in flight — not statically
// renderable, hence idle-state stories only.

export const InForm = () => (
  <form className="w-full max-w-md">
    <SubmitButton pendingLabel="Uploading…" className="h-12 w-full">
      Upload CSV
    </SubmitButton>
  </form>
);

/** The header sign-out button: outline, inverted on hover. */
export const Outline = () => (
  <form>
    <SubmitButton
      variant="outline"
      pendingLabel="Signing out…"
      className="h-11 border-2 px-4 text-xs tracking-widest"
    >
      Sign out
    </SubmitButton>
  </form>
);

export const Disabled = () => (
  <form>
    <SubmitButton pendingLabel="Saving…" disabled className="h-12">
      Save naming
    </SubmitButton>
  </form>
);
