// Vérifie que le HTML généré se charge et se rend sans erreur, avec des mocks
// pour window.storage / window.__fdjAuth (pas de vrai Firebase en local), et
// qu'on peut créer une commande de bout en bout (client → modèle → tissu →
// mesures → livraison/prix), ce qui exerce la nouvelle couche de données
// (creerCommandeAtomique, stores en mémoire).
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { readFileSync } from "node:fs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlPath = path.join(root, "public/index.html");

const MOCK_SCRIPT = `
<script>
const mem = {};
const mockStorage = {
  get: async (k) => (k in mem ? { key: k, value: mem[k] } : null),
  set: async (k, v) => { mem[k] = v; return { key: k, value: v }; },
  delete: async (k) => { delete mem[k]; },
};
window.__fdjFallbackStorage = mockStorage;
window.storage = mockStorage;
let authUser = { email: "diedhiouyayabocar@gmail.com" };
let cb = null;
window.__fdjAuth = {
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => { authUser = null; cb && cb(null); },
  onAuthStateChanged: (f) => { cb = f; setTimeout(() => f(authUser), 10); return () => {}; },
};
window.onerror = (msg, src, line, col, err) => {
  console.log("PAGE_ERROR:", msg, err && err.stack);
};
</script>
`;

const html = readFileSync(htmlPath, "utf8").replace("<body>", `<body>${MOCK_SCRIPT}`);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}\n${err.stack}`));
page.on("dialog", (d) => { console.log("DIALOG:", d.message()); d.accept(); });

await page.goto(`http://localhost:${port}/`);
await page.waitForTimeout(1200);

await page.screenshot({ path: path.join(root, "build/screenshot-01-dashboard.png") });

// --- Aller sur Commandes, ajouter du stock et un modèle si besoin, créer une commande ---
async function clickText(text, selector = "button") {
  const el = page.locator(selector, { hasText: text }).first();
  await el.click({ timeout: 5000 });
}

// Nav vers Commandes
await clickText("Commandes", "nav button");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-02-commandes-vide.png") });

// Nouvelle commande
await clickText("Nouvelle commande", "button");
await page.waitForTimeout(300);

// Étape 1 : nouveau client
await clickText("+ Nouveau client", "button");
await page.waitForTimeout(200);
const nomInputs = page.locator("input[type=text], input:not([type])");
await page.fill("text=Nom >> xpath=following::input[1]", "").catch(() => {});
// Remplissage plus robuste via labels
async function fillField(labelText, value) {
  const field = page.locator("label", { hasText: labelText });
  const input = field.locator("input, textarea, select").first();
  await input.fill(String(value));
}
await fillField("Nom", "Diedhiou");
await fillField("Prénoms", "Yaya Bocar");
await fillField("Téléphone", "77 000 00 00");
await clickText("Ajouter", "button");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-03-etape1.png") });

await clickText("Suivant", "button");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-04-etape2.png") });

// Étape 2 : modèle + tissu (seed data : Queen Dress / Ensemble Awa, Bazin riche / Wax)
await page.selectOption("select >> nth=0", { label: "Queen Dress (Robes)" }).catch(async () => {
  const opts = await page.locator("select >> nth=0 >> option").allTextContents();
  console.log("Options modèle:", opts);
});
await page.waitForTimeout(200);
await page.selectOption("select >> nth=1", { index: 1 }).catch(async () => {
  const opts = await page.locator("select >> nth=1 >> option").allTextContents();
  console.log("Options tissu:", opts);
});
await page.fill('input[placeholder="Quantité utilisée (m)"]', "6");
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(root, "build/screenshot-05-etape2-remplie.png") });

await clickText("Suivant", "button");
await page.waitForTimeout(300);

// Étape 3 : mesures (genre pré-rempli depuis le client si dispo, sinon choisir Femme)
const femmeBtn = page.locator(".fdj-modal-in button", { hasText: /^Femme$/ }).first();
if (await femmeBtn.isVisible().catch(() => false)) await femmeBtn.click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(root, "build/screenshot-06-etape3.png") });

await clickText("Suivant", "button");
await page.waitForTimeout(300);

// Étape 4 : livraison + prix
await page.fill('input[type=date]', "2026-09-15");
await fillField("Acompte versé", "20000");
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(root, "build/screenshot-07-etape4.png") });

await clickText("Créer la commande", "button");
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(root, "build/screenshot-08-commande-creee.png") });

// Ouvrir la fiche commande
await page.waitForTimeout(600);
const carte = page.locator(".cursor-pointer", { hasText: "CMD-" }).first();
console.log("Carte commande visible ?", await carte.isVisible().catch((e) => String(e)));
await carte.click({ timeout: 5000 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(root, "build/screenshot-09-fiche-commande.png") });

// Fermer la fiche commande avant de changer d'onglet
await page.locator('.fdj-modal-in button[aria-label="Fermer"]').first().click();
await page.waitForTimeout(300);

// Dashboard : vérifier "à faire aujourd'hui"
await clickText("Tableau de bord", "nav button");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-10-dashboard-apres.png") });

console.log("--- Logs navigateur ---");
logs.forEach((l) => console.log(l));

await browser.close();
server.close();

const erreurs = logs.filter((l) => l.startsWith("[pageerror]") || l.includes("PAGE_ERROR"));
if (erreurs.length > 0) {
  console.error(`ÉCHEC : ${erreurs.length} erreur(s) JS détectée(s).`);
  process.exit(1);
}
console.log("✓ Parcours complet exécuté sans erreur JS.");
