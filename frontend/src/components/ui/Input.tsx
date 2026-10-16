import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, error, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(
          "h-10 w-full rounded-control border bg-base px-3 text-sm placeholder:text-muted",
          error ? "border-bad" : "border-line hover:border-accent/50",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-err`} className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
});
