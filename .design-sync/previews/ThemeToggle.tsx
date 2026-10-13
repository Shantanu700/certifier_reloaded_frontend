import { ThemeToggle } from "certifier_reloaded_frontend";

export const Light = () => (
  <div className="bg-background p-6 text-foreground">
    <ThemeToggle />
  </div>
);

/** Same component under the `.dark` class — the toggle swaps its own label and icon. */
export const Dark = () => (
  <div className="dark bg-background p-6 text-foreground">
    <ThemeToggle />
  </div>
);
