export interface AccessGateTheme {
  bg: string
  fg: string
  muted: string
  accent: string
  accentFg: string
  ring: string
  error: string
  radius: string
  font: string
  fieldBg: string
  fieldBorder: string
  markBg: string
}

const TOKEN_NAMES: Record<keyof AccessGateTheme, string> = {
  bg: "--nag-bg",
  fg: "--nag-fg",
  muted: "--nag-muted",
  accent: "--nag-accent",
  accentFg: "--nag-accent-fg",
  ring: "--nag-ring",
  error: "--nag-error",
  radius: "--nag-radius",
  font: "--nag-font",
  fieldBg: "--nag-field-bg",
  fieldBorder: "--nag-field-border",
  markBg: "--nag-mark-bg",
}

export const themeToStyle = (theme: Partial<AccessGateTheme> | undefined): Record<string, string> => {
  const style: Record<string, string> = {}
  if (!theme) return style
  for (const [name, value] of Object.entries(theme)) {
    const token = TOKEN_NAMES[name as keyof AccessGateTheme]
    if (token && typeof value === "string") style[token] = value
  }
  return style
}

export const css: string = `
:where(.nag-root){
  --nag-bg:#f7f6f3;
  --nag-fg:#1d1c1a;
  --nag-muted:#6b6862;
  --nag-accent:#1d1c1a;
  --nag-accent-fg:#fbfaf8;
  --nag-ring:var(--nag-accent);
  --nag-error:#b42318;
  --nag-radius:10px;
  --nag-font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --nag-field-bg:#fff;
  --nag-field-border:#8d8a83;
  --nag-mark-bg:#fff;
}
@media (prefers-color-scheme:dark){
  :where(.nag-root){
    --nag-bg:#121211;
    --nag-fg:#f1efea;
    --nag-muted:#a3a09a;
    --nag-accent:#f1efea;
    --nag-accent-fg:#121211;
    --nag-error:#ff8a7a;
    --nag-field-bg:#1b1b19;
    --nag-field-border:#6b6862;
    --nag-mark-bg:#1b1b19;
  }
}
@media (prefers-contrast:more){
  :where(.nag-root){--nag-muted:var(--nag-fg);--nag-field-border:var(--nag-fg)}
}
.nag-root{
  box-sizing:border-box;
  min-height:100vh;
  min-height:100dvh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:64px 24px;
  background:var(--nag-bg);
  color:var(--nag-fg);
  font-family:var(--nag-font);
  font-size:16px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  -webkit-text-size-adjust:100%;
  color-scheme:light dark;
}
.nag-root *,.nag-root *::before,.nag-root *::after{box-sizing:inherit}
.nag-main{width:100%;max-width:352px;margin:0 auto}
.nag-mark{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:40px;
  height:40px;
  margin-bottom:32px;
  overflow:hidden;
  border:1px solid color-mix(in srgb,var(--nag-field-border) 45%,transparent);
  border-radius:var(--nag-radius);
  background:var(--nag-mark-bg);
  box-shadow:0 1px 2px color-mix(in srgb,var(--nag-fg) 6%,transparent);
}
.nag-mark svg{width:20px;height:20px}
.nag-mark img{max-width:100%;max-height:100%}
.nag-title{margin:0;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;text-wrap:balance}
.nag-description{margin:8px 0 0;color:var(--nag-muted);text-wrap:pretty}
.nag-form{display:flex;flex-direction:column;gap:8px;margin:32px 0 0}
.nag-label{font-size:14px;font-weight:500;line-height:1.4}
.nag-input{
  width:100%;
  height:48px;
  margin:0;
  padding:0 14px;
  border:1px solid var(--nag-field-border);
  border-radius:var(--nag-radius);
  background:var(--nag-field-bg);
  color:var(--nag-fg);
  font:inherit;
  letter-spacing:0.08em;
  transition:border-color .15s ease;
}
.nag-input::placeholder{color:var(--nag-muted);letter-spacing:0;opacity:1}
.nag-input:-webkit-autofill{-webkit-text-fill-color:var(--nag-fg);box-shadow:inset 0 0 0 48px var(--nag-field-bg)}
.nag-input:focus,.nag-button:focus{outline:none}
.nag-input:focus-visible,.nag-button:focus-visible{outline:2px solid var(--nag-ring);outline-offset:2px}
.nag-input[aria-invalid="true"]{border-color:var(--nag-error);outline-color:var(--nag-error)}
.nag-error{margin:0;font-size:14px;line-height:1.4;color:var(--nag-error);text-wrap:pretty}
.nag-button{
  height:48px;
  margin:8px 0 0;
  padding:0 20px;
  border:1px solid transparent;
  border-radius:var(--nag-radius);
  background:var(--nag-accent);
  color:var(--nag-accent-fg);
  font:inherit;
  font-weight:500;
  cursor:pointer;
  transition:background-color .15s ease;
}
.nag-button:hover{background:color-mix(in srgb,var(--nag-accent) 86%,var(--nag-bg))}
.nag-button:active{background:color-mix(in srgb,var(--nag-accent) 78%,var(--nag-bg))}
@media (max-width:480px){.nag-root{padding:40px 20px}}
@media (prefers-reduced-motion:reduce){.nag-input,.nag-button{transition:none}}
@media (forced-colors:active){.nag-input[aria-invalid="true"]{border-width:2px}}
`
