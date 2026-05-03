import * as React from "react"
import { cn } from "@/lib/utils"

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ReactNode
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    const [isFilled, setIsFilled] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsFilled(e.target.value.length > 0)
      props.onChange?.(e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setIsFilled(e.target.value.length > 0)
      props.onBlur?.(e)
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "peer h-14 px-5 pt-6 pb-2 w-full bg-background border border-input rounded-xl",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className
          )}
          placeholder=" "
          {...props}
        />
        <label
          className={cn(
            "absolute left-5 text-sm text-muted-foreground",
            "pointer-events-none transition-all duration-200",
            isFilled || isFocused
              ? "top-2 text-xs text-primary"
              : "top-4 text-base text-muted-foreground"
          )}
        >
          {label}
        </label>
        {icon && (
          <div className={cn(
            "absolute right-5 top-4 h-5 w-5 text-muted-foreground transition-colors",
            isFocused && "text-primary"
          )}>
            {icon}
          </div>
        )}
        {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

export { FloatingInput }
