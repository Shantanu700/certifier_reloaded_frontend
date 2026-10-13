import { Button } from "certifier_reloaded_frontend";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Generate</Button>
    <Button variant="outline">Add box</Button>
    <Button variant="secondary">Duplicate</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Delete batch</Button>
    <Button variant="link">View certificate</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="xs">XS</Button>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="outline" size="sm">
      <Plus className="size-4" aria-hidden="true" />
      Add box
    </Button>
    <Button>
      Enter console
      <ArrowRight className="size-4" aria-hidden="true" />
    </Button>
    <Button variant="ghost" size="icon" aria-label="Delete">
      <Trash2 />
    </Button>
    <Button variant="outline" size="icon-sm" aria-label="Add">
      <Plus />
    </Button>
  </div>
);

export const States = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Disabled</Button>
    <Button variant="outline" disabled>
      Disabled
    </Button>
    <Button aria-invalid="true">Invalid</Button>
    <Button aria-busy="true" disabled>
      Uploading…
    </Button>
  </div>
);

/** The login CTA: full-width, oversized, tracked-tight. */
export const HeroCta = () => (
  <div className="w-full max-w-md">
    <Button className="h-14 w-full gap-3 text-base tracking-tighter">
      Enter Console
      <ArrowRight className="size-5" aria-hidden="true" />
    </Button>
  </div>
);
