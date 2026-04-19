import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"

const isVercel = process.env.VERCEL === "1"
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Lora } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { CurrencyProvider } from "@/contexts/currency-context"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const lora = Lora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "Invoice & Billing SaaS",
  description: "Professional invoice and billing management system for SMEs",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.className} antialiased`}
        style={{
          ["--font-sans" as string]: plusJakartaSans.style.fontFamily,
          ["--font-mono" as string]: ibmPlexMono.style.fontFamily,
          ["--font-serif" as string]: lora.style.fontFamily,
        }}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <CurrencyProvider>
            {children}
            <CookieConsent />
            {isVercel && <Analytics />}
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
