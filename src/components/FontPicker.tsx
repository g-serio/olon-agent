import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { buildGoogleFontsCssUrl, filterFontCatalog } from "@/lib/google-fonts";
import type { FontCatalogItem, TypographyFontChoice } from "@/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";

interface FontPickerProps {
  fonts: FontCatalogItem[];
  label: string;
  placeholder: string;
  value: TypographyFontChoice | null;
  previewText: string;
  onSelect: (font: FontCatalogItem) => void;
}

function buildPreviewStack(font: FontCatalogItem): string {
  const fallback =
    font.category === "monospace"
      ? "\"SFMono-Regular\", \"JetBrains Mono\", monospace"
      : font.category === "serif"
        ? "Georgia, serif"
        : "Helvetica, Arial, sans-serif";

  return `"${font.family}", ${fallback}`;
}

export function FontPicker({
  fonts,
  label,
  placeholder,
  value,
  previewText,
  onSelect,
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredFonts = useMemo(() => filterFontCatalog(fonts, query, 14), [fonts, query]);
  const activeFont = filteredFonts[activeIndex] ?? null;

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const families = Array.from(
      new Set(
        [value?.family ?? "", ...filteredFonts.slice(0, 8).map((font) => font.family)].filter(Boolean)
      )
    );

    const href = buildGoogleFontsCssUrl(families);
    const linkId = `google-fonts-picker-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!href) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = href;
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);

    return () => {
      if (document.getElementById(linkId) === link) {
        link.remove();
      }
    };
  }, [filteredFonts, label, value?.family]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredFonts.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredFonts.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const font = filteredFonts[activeIndex];
      if (!font) return;
      onSelect(font);
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div className="font-picker">
      <label className="field__label">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="font-picker__trigger">
            <span
              className={[
                "font-picker__trigger-value",
                value ? "" : "font-picker__trigger-value--placeholder",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ fontFamily: value?.stack ?? "inherit" }}
            >
              {value?.family ?? placeholder}
            </span>
            <ChevronsUpDown size={16} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="font-picker__content">
          <Command className="font-picker__command">
            <div className="font-picker__search">
              <Search size={15} aria-hidden="true" />
              <CommandInput
                ref={inputRef}
                className="font-picker__search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={label}
              />
            </div>

            <CommandList className="font-picker__list">
              {filteredFonts.length === 0 ? (
                <CommandEmpty className="font-picker__empty">
                  Nessun font trovato per “{query}”.
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Google Fonts" className="font-picker__group">
                  {filteredFonts.map((font, index) => {
                    const selected = value?.family === font.family;
                    const active = index === activeIndex;
                    return (
                      <CommandItem
                        key={`${font.family}-${font.category}`}
                        className={[
                          "font-picker__item",
                          selected ? "font-picker__item--selected" : "",
                          active ? "font-picker__item--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          onSelect(font);
                          setQuery("");
                          setOpen(false);
                        }}
                        role="option"
                        aria-selected={selected}
                      >
                        <div className="font-picker__item-top">
                          <span className="font-picker__item-family">{font.family}</span>
                          <span className="font-picker__item-category">{font.category}</span>
                        </div>
                        <div
                          className="font-picker__item-preview"
                          style={{ fontFamily: buildPreviewStack(font) }}
                        >
                          {previewText}
                        </div>
                        {selected ? (
                          <span className="font-picker__item-check">
                            <Check size={14} aria-hidden="true" />
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div
        className="font-preview"
        style={{
          fontFamily: (activeFont ? buildPreviewStack(activeFont) : value?.stack) ?? "inherit",
        }}
      >
        {previewText}
      </div>
    </div>
  );
}
