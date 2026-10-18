import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FlashToaster } from "@/components/flash-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Certifier",
  description: "Produce certificates in bulk from one design and a CSV.",
};

const themeInit = `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading a cookie here makes every route dynamic; they all read the session anyway.
  const flash = parseFlash((await cookies()).get(FLASH_COOKIE)?.value);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", spaceGrotesk.variable, geistMono.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <FlashToaster flash={flash} />
      </body>
    </html>
  );
}
