"use client"

import { useState, useEffect } from "react"
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookieConsent")
    if (!consent) {
      // Show after a small delay for better UX
      const timer = setTimeout(() => {
        setShow(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted")
    setShow(false)
    toast.success("Cookie preferences saved")
  }

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected")
    setShow(false)
    toast.info("Cookie preferences saved")
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none">
      <Card className="max-w-4xl mx-auto shadow-2xl border-2 pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Cookie className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base md:text-lg">We use cookies</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By
                  clicking "Accept All", you consent to our use of cookies.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                Accept All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

