"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Currency = "PKR" | "USD" | "EUR" | "GBP"

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatCurrency: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("PKR")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem("currency") as Currency
      if (savedCurrency && ["PKR", "USD", "EUR", "GBP"].includes(savedCurrency)) {
        setCurrencyState(savedCurrency)
      }
      setMounted(true)
    }
  }, [])

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency)
    if (typeof window !== "undefined") {
      localStorage.setItem("currency", newCurrency)
    }
  }

  const formatCurrency = (amount: number): string => {
    const symbols: Record<Currency, string> = {
      PKR: "PKR",
      USD: "$",
      EUR: "€",
      GBP: "£",
    }

    const symbol = symbols[currency]
    const formatted = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    // For PKR, show "PKR" before the amount, for others show symbol before
    if (currency === "PKR") {
      return `${symbol} ${formatted}`
    } else {
      return `${symbol}${formatted}`
    }
  }

  // Always provide context, even when not mounted (use default values)
  const contextValue = mounted
    ? { currency, setCurrency, formatCurrency }
    : {
        currency: "PKR" as Currency,
        setCurrency: (newCurrency: Currency) => {
          // No-op during SSR
        },
        formatCurrency: (amount: number) => {
          return `PKR ${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        },
      }

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}

