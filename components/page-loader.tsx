export function PageLoader({ text = "Loading" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] spinner-fade-in">
      {/* Outer pulse ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full border-4 border-primary/10 spinner-pulse-ring" />

        {/* Spinning ring */}
        <svg className="w-16 h-16 spinner-ring" viewBox="0 0 64 64" fill="none">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/60"
          />
          <path
            d="M32 4a28 28 0 0 1 28 28"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>

        {/* Center dot */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-primary/80" />
      </div>

      {/* Text */}
      <p className="mt-5 text-sm font-medium text-muted-foreground tracking-wide">
        {text}<span className="inline-flex w-6 text-left animate-pulse">...</span>
      </p>
    </div>
  )
}
