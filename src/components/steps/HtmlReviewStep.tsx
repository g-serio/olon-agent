import React, { useRef, useEffect, useMemo } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface HtmlReviewStepProps {
  htmlContent: string;  // React/TSX code from Agent 1
  chatHistory: ChatMessage[];
  refinementInput: string;
  isRefining: boolean;
  refinementStream: string;
  onRefinementInputChange: (v: string) => void;
  onRefine: () => void;
  onApprove: () => void;
}

/** Wrap React/TSX code in a standalone HTML page for iframe preview */
function wrapForPreview(reactCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    /* shadcn stub styles */
    .btn { display:inline-flex;align-items:center;justify-content:center;padding:0.5rem 1rem;border-radius:0.375rem;font-weight:500;cursor:pointer;transition:all 0.2s;border:none; }
    .card { background:white;border:1px solid #e2e8f0;border-radius:0.5rem;overflow:hidden; }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react,typescript">
// Stub shadcn components for preview
const Button = ({ children, className = "", variant = "default", size = "default", asChild, ...p }) => {
  const base = "inline-flex items-center justify-content-center font-medium transition-colors focus-visible:outline-none disabled:opacity-50 rounded-md";
  const variants = { default:"bg-slate-900 text-white hover:bg-slate-800", outline:"border border-input bg-background hover:bg-accent", ghost:"hover:bg-accent hover:text-accent-foreground", secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80", link:"underline-offset-4 hover:underline text-primary" };
  const sizes = { default:"h-10 py-2 px-4", sm:"h-9 px-3 text-sm", lg:"h-11 px-8 text-base", icon:"h-10 w-10" };
  const cls = [base, variants[variant]||variants.default, sizes[size]||sizes.default, className].join(" ");
  if (asChild && React.Children.count(children) === 1) {
    return React.cloneElement(React.Children.only(children), { className: cls, ...p });
  }
  return <button className={cls} {...p}>{children}</button>;
};
const Card = ({className="", ...p}) => <div className={"rounded-lg border bg-card text-card-foreground shadow-sm "+className} {...p}/>;
const CardHeader = ({className="", ...p}) => <div className={"flex flex-col space-y-1.5 p-6 "+className} {...p}/>;
const CardTitle = ({className="", ...p}) => <h3 className={"text-2xl font-semibold leading-none tracking-tight "+className} {...p}/>;
const CardDescription = ({className="", ...p}) => <p className={"text-sm text-muted-foreground "+className} {...p}/>;
const CardContent = ({className="", ...p}) => <div className={"p-6 pt-0 "+className} {...p}/>;
const CardFooter = ({className="", ...p}) => <div className={"flex items-center p-6 pt-0 "+className} {...p}/>;
const Badge = ({className="", variant="default", ...p}) => <div className={"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold "+className} {...p}/>;
const Separator = ({className="", ...p}) => <div className={"shrink-0 bg-border h-[1px] w-full "+className} {...p}/>;
const Avatar = ({className="", ...p}) => <span className={"relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full "+className} {...p}/>;
const AvatarImage = ({className="", src, alt=""}) => <img src={src} alt={alt} className={"aspect-square h-full w-full "+className}/>;
const AvatarFallback = ({className="", ...p}) => <span className={"flex h-full w-full items-center justify-center rounded-full bg-muted "+className} {...p}/>;
const Input = ({className="", ...p}) => <input className={"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm "+className} {...p}/>;
const NavigationMenu = ({className="", ...p}) => <nav className={"relative z-10 flex max-w-max flex-1 items-center justify-center "+className} {...p}/>;
const NavigationMenuList = ({className="", ...p}) => <ul className={"group flex flex-1 list-none items-center justify-center space-x-1 "+className} {...p}/>;
const NavigationMenuItem = ({...p}) => <li {...p}/>;
const NavigationMenuLink = ({className="", ...p}) => <a className={"block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground "+className} {...p}/>;
const Tabs = ({defaultValue, children, className=""}) => {
  const [val, setVal] = React.useState(defaultValue);
  return <div className={className} data-tab-val={val} data-set-tab={setVal}>{React.Children.map(children, c => React.cloneElement(c, {_val:val, _set:setVal}))}</div>;
};
const TabsList = ({className="", ...p}) => <div className={"inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground "+className} {...p}/>;
const TabsTrigger = ({value, children, _val, _set, className=""}) => <button className={"inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all "+(_val===value?"bg-background text-foreground shadow-sm":"")+" "+className} onClick={()=>_set&&_set(value)}>{children}</button>;
const TabsContent = ({value, children, _val}) => _val===value?<div>{children}</div>:null;
const Accordion = ({children, ...p}) => <div {...p}>{children}</div>;
const AccordionItem = ({children, value, ...p}) => { const [o, setO] = React.useState(false); return <div className="border-b" {...p}>{React.Children.map(children, c => React.cloneElement(c, {_open:o, _toggle:()=>setO(!o)}))}</div>; };
const AccordionTrigger = ({children, _open, _toggle, className=""}) => <button className={"flex flex-1 items-center justify-between py-4 font-medium transition-all w-full "+className} onClick={_toggle}>{children}<span>{_open?"▲":"▼"}</span></button>;
const AccordionContent = ({children, _open, className=""}) => _open?<div className={"overflow-hidden text-sm transition-all "+className}><div className="pb-4 pt-0">{children}</div></div>:null;
const Sheet = ({children}) => { const [o, setO] = React.useState(false); return React.Children.map(children, c => React.cloneElement(c, {_open:o, _set:setO})); };
const SheetTrigger = ({children, asChild, _set}) => { const el = asChild?React.Children.only(children):children; return React.cloneElement(el, {onClick:()=>_set&&_set(true)}); };
const SheetContent = ({children, _open, _set, side="right"}) => _open?<div className="fixed inset-0 z-50 flex"><div className="fixed inset-0 bg-black/50" onClick={()=>_set&&_set(false)}/><div className={"fixed top-0 bottom-0 "+( side==="right"?"right-0":"left-0")+" w-3/4 max-w-sm bg-white p-6 shadow-xl overflow-auto"}>{children}</div></div>:null;
const SheetClose = ({children, _set}) => React.cloneElement(children, {onClick:()=>_set&&_set(false)});

// ── USER'S GENERATED CODE ──
${reactCode}

// ── MOUNT ──
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
</script>
</body>
</html>`;
}

export function HtmlReviewStep({
  htmlContent,
  chatHistory,
  refinementInput,
  isRefining,
  refinementStream,
  onRefinementInputChange,
  onRefine,
  onApprove,
}: HtmlReviewStepProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeDoc = useMemo(() => wrapForPreview(htmlContent), [htmlContent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, refinementStream]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isRefining) {
      e.preventDefault();
      onRefine();
    }
  };

  return (
    <div style={{ display: "flex", gap: 16, height: "80vh", minHeight: 600 }}>
      {/* ── Left: preview ─────────────────────────────────────────── */}
      <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="agent-tag agent-tag--a1">◈ Agente 1 — Preview React</div>
          <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: "auto" }}>
            shadcn stubs · Tailwind CDN
          </span>
        </div>
        <iframe
          srcDoc={iframeDoc}
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "#fff",
          }}
          sandbox="allow-scripts"
          title="React Preview"
        />
      </div>

      {/* ── Right: chat ───────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          flex: "0 0 calc(35% - 16px)",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          height: "100%",
          overflow: "hidden",
          gap: 0,
        }}
      >
        <div className="card__head" style={{ marginBottom: 12, flexShrink: 0 }}>
          <div className="card__title" style={{ fontSize: 16 }}>Modifiche</div>
          <div className="card__desc" style={{ fontSize: 12 }}>
            Quando sei soddisfatto clicca Approva per avviare il build.
          </div>
        </div>

        {/* Chat history */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {chatHistory.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-dim)", textAlign: "center", marginTop: 24 }}>
              Nessuna modifica ancora.
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
              <div style={{
                padding: "8px 12px",
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: msg.role === "user" ? "var(--primary)" : "var(--elevated)",
                color: msg.role === "user" ? "#EDE8F8" : "var(--fg-muted)",
                fontSize: 12, lineHeight: 1.5,
                border: msg.role === "user" ? "none" : "1px solid var(--border)",
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isRefining && (
            <div style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
              <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "var(--elevated)", border: "1px solid var(--border)", fontSize: 12, color: "var(--pri-lt)" }}>
                <span className="pulse">
                  {refinementStream ? `${(refinementStream.length / 1024).toFixed(1)} KB generati…` : "Elaborando…"}
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            className="field__input"
            rows={3}
            placeholder="es. Rendi l'hero più grande, cambia font dei titoli, aggiungi sezione team…"
            value={refinementInput}
            onChange={(e) => onRefinementInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRefining}
            style={{ resize: "none", fontSize: 12 }}
          />
          <div style={{ fontSize: 10, color: "var(--fg-dim)", textAlign: "right" }}>⌘+Enter</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" style={{ flex: 1 }} onClick={onRefine} disabled={isRefining || !refinementInput.trim()}>
              {isRefining ? "Generando…" : "Invia"}
            </button>
            <button className="btn btn--accent" style={{ flex: 1 }} onClick={onApprove} disabled={isRefining}>
              Approva →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
