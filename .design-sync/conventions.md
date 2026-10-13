## Building with Certifier — the Kinetic Typography system

**No provider.** These components are styled entirely by `styles.css`. There is no theme
provider, context, or root wrapper to mount — link the stylesheet, load the bundle, render.

**Dark mode is a class.** `.dark` on any ancestor flips every token (the app puts it on
`<html>`). The variant is `&:is(.dark *)`, so `<div className="dark">…</div>` themes a
subtree just as well.

**Fonts ship inside the bundle.** Space Grotesk (`font-sans`, and `font-heading`) and Geist
Mono (`font-mono`) are embedded as `@font-face` data URIs in `_ds_bundle.css`. Don't load
them from a font host and don't substitute a fallback — the entire look is that typeface,
uppercased and tracked out.

### The idiom: Tailwind v4 utilities over semantic tokens

Style with the token-bound classes below. Never hex values, never a one-off stylesheet.

| Family | Classes |
|---|---|
| Ground | `bg-background` / `text-foreground`, `bg-card`, `bg-popover` |
| Accent — the only colour | `bg-accent` + `text-accent-foreground`, `bg-primary` + `text-primary-foreground`. Both are acid yellow `#dfe104`, identical in light and dark. |
| Quiet | `bg-muted`, `text-muted-foreground`, `bg-secondary` + `text-secondary-foreground` |
| Lines | `border-border`, `border-input`, `ring-ring`, `outline-accent` |
| Danger | `bg-destructive`, `text-destructive` |
| Data | `bg-chart-1` … `bg-chart-5` (chart-1 is the accent, then greyscale) |
| Type | `font-sans`, `font-heading`, `font-mono` |

Every class above is present in the shipped CSS. Opacity modifiers (`bg-accent/20`) and
generic geometry (`flex`, `p-6`, `grid-cols-3`) come from the design runtime's own Tailwind.

### Five rules that define the look

1. **Never use the accent as a text colour.** `text-accent` and `text-primary` fail contrast
   on `bg-background`. Yellow is a *fill*: `bg-accent text-accent-foreground`. This is also
   why `<Button variant="link">` is effectively unusable on the default ground — reach for
   `variant="ghost"` instead.
2. **Zero radius, zero shadow.** `--radius: 0`. Never add `rounded-*` or `shadow-*`.
3. **Borders are 2px.** `border-2 border-border` is the default frame; 1px is the exception.
4. **Case and tracking carry the hierarchy.** Display text is `uppercase tracking-tighter`
   and oversized — `text-[clamp(3rem,12vw,10rem)]` for heroes. Small labels are
   `text-xs font-bold tracking-widest uppercase`.
5. **Hairline grids, not cards.** `grid gap-px bg-border` with `bg-background` children draws
   1px rules *between* cells; `gap-px` never rules the outer edge, so the container needs its
   own `border-2`. Depth comes from oversized `text-muted` background numerals — never
   elevation. There is no marquee and no scrolling text.

### Where the truth lives

- `styles.css` and the `_ds_bundle.css` it imports — every token definition and every shipped
  utility. Read it before inventing a class name.
- `guidelines/theme.md` — the full Kinetic Typography spec.
- `components/general/<Name>/<Name>.prompt.md` — per-component API and examples.

### Idiomatic snippet

```jsx
const { Button, Wordmark } = window.CertifierDS;

<div className="border-2 border-border bg-background text-foreground">
  <div className="flex items-center justify-between border-b-2 border-border px-6 py-5">
    <Wordmark />
    <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
      Batch 04
    </span>
  </div>
  <div className="grid gap-px bg-border sm:grid-cols-2">
    <div className="bg-background p-8">
      <p className="text-6xl font-bold tracking-tighter uppercase">1,204</p>
      <p className="mt-2 text-xs tracking-widest text-muted-foreground uppercase">Issued</p>
    </div>
    <div className="flex items-end bg-background p-8">
      <Button className="w-full">Generate</Button>
    </div>
  </div>
</div>
```
