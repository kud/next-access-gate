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
  --nag-muted:#6f6c66;
  --nag-accent:#1d1c1a;
  --nag-accent-fg:#fbfaf8;
  --nag-ring:#5b7cfa;
  --nag-error:#b42318;
  --nag-radius:12px;
  --nag-font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --nag-field-bg:#ffffff;
  --nag-field-border:#dedbd4;
  --nag-mark-bg:#ffffff;
}
@media (prefers-color-scheme:dark){
  :where(.nag-root){
    --nag-bg:#121211;
    --nag-fg:#f1efea;
    --nag-muted:#a3a09a;
    --nag-accent:#f1efea;
    --nag-accent-fg:#121211;
    --nag-ring:#8aa2ff;
    --nag-error:#ff8a7a;
    --nag-field-bg:#1b1b19;
    --nag-field-border:#34332f;
    --nag-mark-bg:#1b1b19;
  }
}
.nag-root{
  box-sizing:border-box;
  min-height:100vh;
  min-height:100dvh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:48px 24px;
  background:var(--nag-bg);
  color:var(--nag-fg);
  font-family:var(--nag-font);
  font-size:16px;
  line-height:1.55;
  -webkit-font-smoothing:antialiased;
  color-scheme:light dark;
}
.nag-root *,.nag-root *::before,.nag-root *::after{box-sizing:inherit}
.nag-main{width:100%;max-width:360px;margin:0 auto}
.nag-mark{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:44px;
  height:44px;
  margin-bottom:28px;
  border:1px solid var(--nag-field-border);
  border-radius:calc(var(--nag-radius) + 2px);
  background:var(--nag-mark-bg);
  color:var(--nag-fg);
}
.nag-mark svg{width:20px;height:20px}
.nag-mark img{max-width:100%;max-height:100%}
.nag-title{margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.015em}
.nag-description{margin:0 0 32px;color:var(--nag-muted)}
.nag-form{display:flex;flex-direction:column;gap:12px;margin:0}
.nag-label{font-size:14px;font-weight:500}
.nag-input{
  width:100%;
  height:48px;
  padding:0 16px;
  border:1px solid var(--nag-field-border);
  border-radius:var(--nag-radius);
  background:var(--nag-field-bg);
  color:var(--nag-fg);
  font:inherit;
  letter-spacing:0.02em;
  transition:border-color .15s ease,box-shadow .15s ease;
}
.nag-input:focus{outline:none}
.nag-input:focus-visible{border-color:var(--nag-ring);box-shadow:0 0 0 3px color-mix(in srgb,var(--nag-ring) 35%,transparent)}
.nag-input[aria-invalid="true"]{border-color:var(--nag-error)}
.nag-button{
  height:48px;
  margin-top:4px;
  padding:0 20px;
  border:0;
  border-radius:var(--nag-radius);
  background:var(--nag-accent);
  color:var(--nag-accent-fg);
  font:inherit;
  font-weight:500;
  cursor:pointer;
  transition:opacity .15s ease,box-shadow .15s ease;
}
.nag-button:hover{opacity:.88}
.nag-button:focus{outline:none}
.nag-button:focus-visible{box-shadow:0 0 0 3px var(--nag-bg),0 0 0 6px var(--nag-ring)}
.nag-error{margin:4px 0 0;font-size:14px;color:var(--nag-error)}
@media (prefers-reduced-motion:reduce){.nag-input,.nag-button{transition:none}}
`
