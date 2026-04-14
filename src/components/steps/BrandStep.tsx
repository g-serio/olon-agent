import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileJson,
  ImagePlus,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import {
  applyTypographyPreset,
  buildGoogleFontsCssUrl,
  FALLBACK_FONT_CATALOG,
  getTypographyDirectionPresets,
  getTypographyPresetById,
  resolveFontChoice,
  selectedTypographyFamilies,
  suggestTypographyContract,
} from "@/lib/google-fonts";
import { FontPicker } from "@/components/FontPicker";
import { LlmSetupPanel } from "@/components/LlmSetupPanel";
import { TokenPreview } from "@/components/TokenPreview";
import type {
  AgentModelConfig,
  DsJsonSchema,
  FontCatalogItem,
  ProviderAvailability,
  SvgAsset,
  TypographyContract,
} from "@/types";

interface BrandStepProps {
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  svgAssets: SvgAsset[];
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  typographyContract: TypographyContract;
  llmReady: boolean;
  onDsUpload: (file: File) => void;
  onSvgUpload: (file: File) => void;
  onRemoveSvg: (name: string) => void;
  onTypographyContractChange: (value: TypographyContract) => void;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BrandStep({
  dsJson,
  dsFileName,
  svgAssets,
  providerAvailability,
  providerSetupLoaded,
  agent1Config,
  agent2Config,
  typographyContract,
  llmReady,
  onDsUpload,
  onSvgUpload,
  onRemoveSvg,
  onTypographyContractChange,
  onAgentChange,
  onBack,
  onNext,
}: BrandStepProps) {
  const [drag, setDrag] = useState(false);
  const [svgDrag, setSvgDrag] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fontCatalog, setFontCatalog] = useState<FontCatalogItem[]>(FALLBACK_FONT_CATALOG);

  const presets = useMemo(() => getTypographyDirectionPresets(), []);
  const readyProviders = useMemo(
    () => Object.values(providerAvailability).filter(Boolean).length,
    [providerAvailability]
  );
  const monoFonts = useMemo(
    () => fontCatalog.filter((font) => font.category === "monospace"),
    [fontCatalog]
  );
  const selectedFamilies = useMemo(
    () => selectedTypographyFamilies(typographyContract),
    [typographyContract]
  );
  const previewHref = useMemo(
    () => buildGoogleFontsCssUrl(selectedFamilies),
    [selectedFamilies]
  );
  const activePreset = useMemo(
    () => getTypographyPresetById(typographyContract.direction.presetId),
    [typographyContract.direction.presetId]
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/google-fonts")
      .then((res) => res.json())
      .then((payload: { fonts?: FontCatalogItem[] }) => {
        if (cancelled) return;
        if (Array.isArray(payload.fonts) && payload.fonts.length > 0) {
          setFontCatalog(payload.fonts);
        }
      })
      .catch(() => {
        if (!cancelled) setFontCatalog(FALLBACK_FONT_CATALOG);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedFamilies.length > 0 || !dsJson) return;
    onTypographyContractChange(suggestTypographyContract(dsJson, fontCatalog));
  }, [dsJson, fontCatalog, onTypographyContractChange, selectedFamilies.length]);

  useEffect(() => {
    const linkId = "google-fonts-preview-contract";
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!previewHref) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = previewHref;
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = previewHref;
    document.head.appendChild(link);

    return () => {
      if (document.getElementById(linkId) === link) {
        link.remove();
      }
    };
  }, [previewHref]);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (file.name.endsWith(".json")) onDsUpload(file);
      else if (file.name.endsWith(".svg")) onSvgUpload(file);
    },
    [onDsUpload, onSvgUpload]
  );

  const patchDirectionSource = useCallback(
    (source: TypographyContract["direction"]["source"]): TypographyContract["direction"] => ({
      presetId: typographyContract.direction.presetId,
      source,
    }),
    [typographyContract.direction.presetId]
  );

  const commitFontFamily = useCallback(
    (field: "primary" | "display" | "mono" | "wordmark", font: FontCatalogItem) => {
      const resolved = resolveFontChoice(font.family, [font]);
      if (!resolved) return;

      if (field === "wordmark") {
        onTypographyContractChange({
          ...typographyContract,
          direction: patchDirectionSource(
            typographyContract.direction.presetId ? "mixed" : "manual"
          ),
          wordmark: {
            ...typographyContract.wordmark,
            fontFamily: resolved,
          },
        });
        return;
      }

      onTypographyContractChange({
        ...typographyContract,
        direction: patchDirectionSource(
          typographyContract.direction.presetId ? "mixed" : "manual"
        ),
        fontFamily: {
          ...typographyContract.fontFamily,
          [field]: resolved,
        },
      });
    },
    [onTypographyContractChange, patchDirectionSource, typographyContract]
  );

  const updateWordmarkField = useCallback(
    (field: "weight" | "tracking", value: string) => {
      onTypographyContractChange({
        ...typographyContract,
        direction: patchDirectionSource(
          typographyContract.direction.presetId ? "mixed" : "manual"
        ),
        wordmark: {
          ...typographyContract.wordmark,
          [field]: value,
        },
      });
    },
    [onTypographyContractChange, patchDirectionSource, typographyContract]
  );

  return (
    <div className="workspace-shell">
      <section className="workspace-head">
        <div>
          <div className="workspace-head__eyebrow">Workspace · Setup iniziale</div>
          <h1 className="workspace-head__title">Theme, asset e modelli.</h1>
        </div>
        <div className="workspace-head__status">
          <div className="workspace-status-pill">
            <span
              className={["led", providerSetupLoaded ? "led--ok" : "led--muted"].join(" ")}
            />
            <span>
              {providerSetupLoaded ? `${readyProviders}/3 provider pronti` : "lettura env in corso"}
            </span>
          </div>
          <div className="workspace-status-pill">
            <span className={["led", llmReady ? "led--ok" : "led--warn"].join(" ")} />
            <span>{llmReady ? "setup completo" : "manca un provider richiesto"}</span>
          </div>
        </div>
      </section>

      <div className="workspace-layout">
        <section className="workspace-main">
          <div className="surface-card surface-card--workspace">
            <div className="surface-card__head">
              <div>
                <div className="surface-card__eyebrow">Theme e asset</div>
                <h2 className="surface-card__title">Carica il DNA del tenant</h2>
              </div>
            </div>

            <p className="surface-card__copy">
              Carichi il design system, segnali gli asset proprietari e scegli la direzione
              tipografica che l&apos;agente dovra rispettare nella generazione.
            </p>

            <div className="field">
              <label className="field__label">Design system JSON</label>
              <div
                className={[
                  "dropzone",
                  "dropzone--editorial",
                  drag ? "dropzone--drag" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDrag(false);
                  handleFile(event.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <div className="dropzone__icon">
                  <FileJson size={22} aria-hidden="true" />
                </div>
                {dsFileName ? (
                  <div className="dropzone__label">
                    <strong>{dsFileName}</strong> caricato
                  </div>
                ) : (
                  <div className="dropzone__label">
                    Trascina o <strong>seleziona il .json</strong>
                  </div>
                )}
                <div className="dropzone__sub">
                  olon.theme.schema.json · design-system.schema.json
                </div>
              </div>
              {dsJson && <TokenPreview dsJson={dsJson} />}
            </div>

            <div className="workspace-main-grid">
              <div className="field">
                <label className="field__label">SVG di brand</label>
                <div
                  className={[
                    "dropzone",
                    "dropzone--compact-light",
                    svgDrag ? "dropzone--drag" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setSvgDrag(true);
                  }}
                  onDragLeave={() => setSvgDrag(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setSvgDrag(false);
                    Array.from(event.dataTransfer.files)
                      .filter((file) => file.name.endsWith(".svg"))
                      .forEach(onSvgUpload);
                  }}
                >
                  <input
                    type="file"
                    accept=".svg"
                    multiple
                    onChange={(event) => {
                      if (!event.target.files) return;
                      Array.from(event.target.files).forEach(onSvgUpload);
                    }}
                  />
                  <div className="dropzone__label">
                    <strong className="dropzone__strong-inline">
                      <ImagePlus size={16} aria-hidden="true" />
                      <span>Aggiungi SVG</span>
                    </strong>
                  </div>
                  <div className="dropzone__sub">
                    logo, icone o asset che non devono essere reinventati
                  </div>
                </div>

                {svgAssets.length > 0 && (
                  <div className="file-tags">
                    {svgAssets.map((asset) => (
                      <div className="ftag" key={asset.name}>
                        <span className="ftag__ok">
                          <CheckCircle2 size={14} aria-hidden="true" />
                        </span>
                        {asset.name}
                        <button
                          type="button"
                          className="ftag__rm"
                          aria-label={`Rimuovi ${asset.name}`}
                          onClick={() => onRemoveSvg(asset.name)}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="workspace-brief">
                <div className="workspace-brief__eyebrow">Focus dello step</div>
                <h3 className="workspace-brief__title">Scegli la voce del tenant</h3>
                <p className="workspace-brief__copy">
                  Qui non stai compilando un form di Google Fonts: stai definendo il contratto
                  visivo che il generator dovra seguire senza inventare famiglie alternative.
                </p>
                <div className="workspace-brief__meta">
                  <span>{selectedFamilies.length}/4 famiglie impostate</span>
                  <span>
                    {typographyContract.direction.source === "design-system"
                      ? "suggerito dal design system"
                      : activePreset
                        ? activePreset.label
                        : "nessun preset"}
                  </span>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="field__label">Typography direction</label>
              <div className="font-contract-card">
                <div className="font-contract-card__top">
                  <div>
                    <h3 className="font-contract-card__title">Parti da una direzione guidata</h3>
                    <p className="font-contract-card__copy">
                      Scegli un pairing curato e poi, solo se serve, rifinisci i font in modo
                      avanzato. Il sistema carichera soltanto le famiglie finali selezionate.
                    </p>
                  </div>
                  {typographyContract.direction.source === "design-system" && (
                    <div className="direction-badge">
                      <Sparkles size={14} aria-hidden="true" />
                      <span>Prefill dal design system</span>
                    </div>
                  )}
                </div>

                <div className="direction-grid" role="list" aria-label="Typography presets">
                  {presets.map((preset) => {
                    const selected = typographyContract.direction.presetId === preset.id;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        className={[
                          "direction-option",
                          selected ? "direction-option--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          onTypographyContractChange(
                            applyTypographyPreset(preset.id, typographyContract, fontCatalog)
                          )
                        }
                      >
                        <div className="direction-option__head">
                          <span className="direction-option__label">{preset.label}</span>
                          <span className="direction-option__chip">
                            {preset.primary} / {preset.display}
                          </span>
                        </div>
                        <p className="direction-option__summary">{preset.summary}</p>
                        <div className="direction-option__preview">
                          <div
                            className="direction-option__sample direction-option__sample--body"
                            style={{
                              fontFamily:
                                typographyContract.direction.presetId === preset.id
                                  ? typographyContract.fontFamily.primary?.stack ?? "inherit"
                                  : undefined,
                            }}
                          >
                            Clear structure for brand narratives
                          </div>
                          <div
                            className="direction-option__sample direction-option__sample--display"
                            style={{
                              fontFamily:
                                typographyContract.direction.presetId === preset.id
                                  ? typographyContract.fontFamily.display?.stack ?? "inherit"
                                  : undefined,
                            }}
                          >
                            Display statement
                          </div>
                        </div>
                        <span className="direction-option__rationale">{preset.rationale}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="font-summary">
                  <div className="font-summary__block">
                    <span className="font-summary__label">Primary</span>
                    <strong style={{ fontFamily: typographyContract.fontFamily.primary?.stack ?? "inherit" }}>
                      {typographyContract.fontFamily.primary?.family ?? "Non impostato"}
                    </strong>
                  </div>
                  <div className="font-summary__block">
                    <span className="font-summary__label">Display</span>
                    <strong style={{ fontFamily: typographyContract.fontFamily.display?.stack ?? "inherit" }}>
                      {typographyContract.fontFamily.display?.family ?? "Non impostato"}
                    </strong>
                  </div>
                  <div className="font-summary__block">
                    <span className="font-summary__label">Mono</span>
                    <strong style={{ fontFamily: typographyContract.fontFamily.mono?.stack ?? "inherit" }}>
                      {typographyContract.fontFamily.mono?.family ?? "Opzionale"}
                    </strong>
                  </div>
                  <div className="font-summary__block">
                    <span className="font-summary__label">Wordmark</span>
                    <strong style={{ fontFamily: typographyContract.wordmark.fontFamily?.stack ?? "inherit" }}>
                      {typographyContract.wordmark.fontFamily?.family ?? "Opzionale"}
                    </strong>
                  </div>
                </div>

                <div className="font-preview-rail">
                  <div className="font-preview-card">
                    <span className="font-preview-card__label">Primary voice</span>
                    <div
                      className="font-preview"
                      style={{ fontFamily: typographyContract.fontFamily.primary?.stack ?? "inherit" }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </div>
                  <div className="font-preview-card">
                    <span className="font-preview-card__label">Display hierarchy</span>
                    <div
                      className="font-preview font-preview--display"
                      style={{ fontFamily: typographyContract.fontFamily.display?.stack ?? "inherit" }}
                    >
                      Display hierarchy sample
                    </div>
                  </div>
                </div>

                <div className="font-advanced">
                  <button
                    type="button"
                    className="font-advanced__toggle"
                    onClick={() => setAdvancedOpen((current) => !current)}
                    aria-expanded={advancedOpen}
                  >
                    <span className="font-advanced__title">
                      <Type size={15} aria-hidden="true" />
                      <span>Advanced typography</span>
                    </span>
                    <span className="font-advanced__meta">
                      override manuale di mono, wordmark e pairing
                    </span>
                    {advancedOpen ? (
                      <ChevronUp size={16} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={16} aria-hidden="true" />
                    )}
                  </button>

                  {advancedOpen && (
                    <div className="font-contract-grid">
                      <FontPicker
                        fonts={fontCatalog}
                        label="Primary font"
                        placeholder="Search Google Fonts"
                        value={typographyContract.fontFamily.primary}
                        previewText="The quick brown fox jumps over the lazy dog"
                        onSelect={(font) => commitFontFamily("primary", font)}
                      />

                      <FontPicker
                        fonts={fontCatalog}
                        label="Display font"
                        placeholder="Search Google Fonts"
                        value={typographyContract.fontFamily.display}
                        previewText="Display hierarchy sample"
                        onSelect={(font) => commitFontFamily("display", font)}
                      />

                      <FontPicker
                        fonts={monoFonts}
                        label="Mono font"
                        placeholder="Search monospace fonts"
                        value={typographyContract.fontFamily.mono}
                        previewText="NAV-01 · META · 12PX"
                        onSelect={(font) => commitFontFamily("mono", font)}
                      />

                      <div className="field">
                        <FontPicker
                          fonts={fontCatalog}
                          label="Wordmark font"
                          placeholder="Search Google Fonts"
                          value={typographyContract.wordmark.fontFamily}
                          previewText="Brand Wordmark"
                          onSelect={(font) => commitFontFamily("wordmark", font)}
                        />
                        <div
                          className="font-preview font-preview--wordmark"
                          style={{
                            fontFamily: typographyContract.wordmark.fontFamily?.stack ?? "inherit",
                            fontWeight: typographyContract.wordmark.weight,
                            letterSpacing: typographyContract.wordmark.tracking,
                          }}
                        >
                          Brand Wordmark
                        </div>
                      </div>

                      <div className="field">
                        <label className="field__label">Wordmark weight</label>
                        <select
                          className="field__input"
                          value={typographyContract.wordmark.weight}
                          onChange={(event) => updateWordmarkField("weight", event.target.value)}
                        >
                          {["400", "500", "600", "700", "800"].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label className="field__label">Wordmark tracking</label>
                        <input
                          className="field__input field__input--mono"
                          value={typographyContract.wordmark.tracking}
                          onChange={(event) => updateWordmarkField("tracking", event.target.value)}
                          placeholder="-0.05em"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="workspace-side">
          <div className="surface-card surface-card--workspace">
            <div className="surface-card__head">
              <div>
                <div className="surface-card__eyebrow">Modelli</div>
                <h2 className="surface-card__title">Routing del motore</h2>
              </div>
            </div>
            <LlmSetupPanel
              providerAvailability={providerAvailability}
              agent1Config={agent1Config}
              agent2Config={agent2Config}
              onAgentChange={onAgentChange}
              loaded={providerSetupLoaded}
            />
          </div>

          <div className="surface-card surface-card--workspace">
            <div className="surface-card__head">
              <div>
                <div className="surface-card__eyebrow">Regole attive</div>
                <h2 className="surface-card__title">Comportamento</h2>
              </div>
            </div>

            <div className="policy-list">
              <div className="policy-row">
                <div className="policy-row__head">
                  <Sparkles size={15} aria-hidden="true" />
                  <span>Originale di default</span>
                </div>
                <p>
                  Se non fornisci reference forti, il sistema costruisce layout proprietari e
                  adatta il registro al contenuto.
                </p>
              </div>

              <div className="policy-row">
                <div className="policy-row__head">
                  <Sparkles size={15} aria-hidden="true" />
                  <span>Reference come orientamento</span>
                </div>
                <p>
                  “Tipo questo sito” attiva una sintesi di pattern e gerarchie, non una copia
                  letterale.
                </p>
              </div>

              <div className="policy-row">
                <div className="policy-row__head">
                  <Sparkles size={15} aria-hidden="true" />
                  <span>Clone solo esplicito</span>
                </div>
                <p>
                  La modalita di copia fedele resta eccezionale e va richiesta in modo chiaro.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="btn-row workspace-actions">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          Indietro
        </button>
        <button
          className="btn btn--primary"
          onClick={onNext}
          disabled={!llmReady || !providerSetupLoaded}
        >
          <span>Continua</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
