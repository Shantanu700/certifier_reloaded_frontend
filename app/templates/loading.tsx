import { PageLoader } from "@/components/loader";

// Opening a template or the Canva picker from the list. Step tabs and search
// change only search params, which Next doesn't treat as a new segment, so
// this never hides the pinned certificate during a step click.
export default PageLoader;
