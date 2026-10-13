import { Wordmark } from "certifier_reloaded_frontend";

export const Default = () => <Wordmark />;

/** The app header: wordmark, then a slash-separated breadcrumb. */
export const InHeader = () => (
  <div className="flex w-full items-center gap-4 border-b-2 border-border px-6 py-5">
    <Wordmark className="text-sm" />
    <span className="flex items-center gap-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">
      <span aria-hidden="true">/</span>
      Templates
    </span>
  </div>
);

export const OnAccent = () => (
  <div className="flex w-fit gap-px bg-border">
    <div className="bg-background px-6 py-4">
      <Wordmark />
    </div>
    <div className="bg-foreground px-6 py-4 text-background">
      <Wordmark />
    </div>
  </div>
);
