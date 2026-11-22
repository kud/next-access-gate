export const unconfiguredHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Access gate not configured</title>
<style>
:root{color-scheme:light dark;--bg:#fafaf9;--fg:#1c1917;--muted:#78716c}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:32rem;padding:2rem}
h1{font-size:1.25rem;font-weight:600;margin:0 0 .5rem}
p{margin:0;color:var(--muted)}
code{font:.9em ui-monospace,SFMono-Regular,Menlo,monospace}
</style>
</head>
<body>
<main>
<h1>Access gate not configured</h1>
<p>This site is protected, but no access code has been set. Define <code>ACCESS_GATE_CODES</code> and redeploy.</p>
</main>
</body>
</html>
`
