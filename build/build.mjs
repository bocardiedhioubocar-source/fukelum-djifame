// Construit public/index.html (déployé sur Firebase Hosting) à partir de
// fukelum-djifame-app.jsx.
// Usage : npm run build        (build seul)
//         npm run deploy       (build puis firebase deploy --only hosting)
//
// Étapes :
//   1. esbuild bundle + minifie src/entry.jsx (React + ReactDOM + lucide-react + App) en IIFE.
//   2. Tailwind CLI génère les classes utilitaires réellement utilisées dans le JSX.
//   3. Assemble le HTML final : tête statique (build/template-head.html) + CSS Tailwind
//      + bundle JS + glue Firebase (build/firebase-glue.html, inchangée).
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  console.log("→ Bundle JS (esbuild)…");
  const result = await build({
    entryPoints: [path.join(root, "src/entry.jsx")],
    bundle: true,
    minify: true,
    format: "iife",
    jsx: "automatic",
    target: ["es2019"],
    write: false,
    logLevel: "warning",
  });
  const bundleJs = result.outputFiles[0].text;

  console.log("→ CSS utilitaires (Tailwind CLI)…");
  execSync(
    `npx tailwindcss -i "${path.join(root, "build/tailwind-input.css")}" -o "${path.join(root, "build/tailwind-output.css")}" --minify`,
    { cwd: root, stdio: "pipe" }
  );
  const tailwindCss = readFileSync(path.join(root, "build/tailwind-output.css"), "utf8").trim();

  console.log("→ Assemblage du HTML final…");
  const head = readFileSync(path.join(root, "build/template-head.html"), "utf8").trimEnd();
  const glue = readFileSync(path.join(root, "build/firebase-glue.html"), "utf8").trimEnd();

  const html = `${head}
<style>
/* Utilitaires Tailwind générés à partir des classes utilisées dans le JSX (npm run build) */
${tailwindCss}
</style>
</head>
<body>
<div id="root"></div>
<script>
${bundleJs}
</script>
${glue}
`;

  mkdirSync(path.join(root, "public"), { recursive: true });
  writeFileSync(path.join(root, "public/index.html"), html, "utf8");
  console.log(`✓ public/index.html généré (${(html.length / 1024).toFixed(0)} Ko) — prêt pour "firebase deploy --only hosting"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
