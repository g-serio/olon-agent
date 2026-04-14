import React from "react";

export function Command({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function CommandInput({ className, ...props }, ref) {
  return <input ref={ref} className={className} {...props} />;
});

export function CommandList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} role="listbox">
      {children}
    </div>
  );
}

export function CommandEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CommandGroup({
  children,
  className,
  heading,
}: {
  children: React.ReactNode;
  className?: string;
  heading?: string;
}) {
  return (
    <div className={className}>
      {heading ? <div className="command-group__heading">{heading}</div> : null}
      {children}
    </div>
  );
}

export const CommandItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CommandItem({ className, type, ...props }, ref) {
  return <button ref={ref} type={type ?? "button"} className={className} {...props} />;
});
