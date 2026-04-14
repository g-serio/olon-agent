import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

interface PopoverContextValue {
  contentId: string;
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentRef: React.RefObject<HTMLDivElement>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover components must be used within <Popover>.");
  }
  return context;
}

export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const value = useMemo(
    () => ({ contentId, open, setOpen, triggerRef, contentRef }),
    [contentId, open]
  );

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const { contentId, open, setOpen, triggerRef } = usePopoverContext();

  const props = {
    ref: triggerRef,
    "aria-controls": contentId,
    "aria-expanded": open,
    "aria-haspopup": "dialog" as const,
    onClick: () => setOpen(!open),
  };

  if (asChild) {
    return React.cloneElement(children, props);
  }

  return <button {...props}>{children}</button>;
}

export function PopoverContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { contentId, open, contentRef } = usePopoverContext();

  if (!open) return null;

  return (
    <div
      id={contentId}
      ref={contentRef}
      className={className}
      role="dialog"
      aria-modal="false"
    >
      {children}
    </div>
  );
}
