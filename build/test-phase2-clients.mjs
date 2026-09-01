// Vérifie la Phase 2 : clients en fiches, mesures de référence liées au
// client (avec historique), et la réutilisation des mesures dans une
// nouvelle commande sans écrasement automatique.
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
await page.waitForTimeout(1000);

async function clickText(text, selector = "button") {
  const el = page.locator(selector, { hasText: text }).first();
  await el.click({ timeout: 5000 });
}
async function fillField(labelText, value, root = page) {
  const field = root.locator("label", { hasText: labelText });
  const input = field.locator("input, textarea, select").first();
  await input.fill(String(value));
}

// --- Aller sur Clients, créer un client, vérifier la carte ---
await clickText("Clients", "nav button");
await page.waitForTimeout(300);
await clickText("Nouveau client", "button");
await page.waitForTimeout(200);
await fillField("Nom", "Sarr");
await fillField("Prénoms", "Fatou");
await fillField("Téléphone", "78 111 22 33");
await clickText("Enregistrer", "button");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, "build/screenshot-p2-01-clients-cartes.png") });

const carteClient = page.locator(".cursor-pointer", { hasText: "Fatou" }).first();
console.log("Carte client visible ?", await carteClient.isVisible().catch((e) => String(e)));

// --- Ouvrir la fiche client, ajouter des mesures de référence ---
await carteClient.click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-p2-02-fiche-client.png") });

await clickText("+ Ajouter", "button");
await page.waitForTimeout(300);
await page.fill('.fdj-modal-in input[type=number] >> nth=0', "56");
await page.fill('.fdj-modal-in input[type=number] >> nth=1', "38");
await page.fill('.fdj-modal-in input[type=number] >> nth=2', "36");
await page.fill('.fdj-modal-in input[type=number] >> nth=3', "92");
await page.screenshot({ path: path.join(root, "build/screenshot-p2-03-mesures-form.png") });
await clickText("Enregistrer les mesures", "button");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, "build/screenshot-p2-04-fiche-client-avec-mesures.png") });

const texteFiche = await page.locator(".fdj-modal-in").innerText();
console.log("Fiche client contient 'Mises à jour le' ?", texteFiche.includes("Mises à jour le"));
console.log("Fiche client contient '56' (tour de tête) ?", texteFiche.includes("56"));

// Fermer la fiche client
await page.locator('.fdj-modal-in button[aria-label="Fermer"]').first().click();
await page.waitForTimeout(300);

// --- Nouvelle commande pour ce même client : vérifier la reprise des mesures ---
await clickText("Commandes", "nav button");
await page.waitForTimeout(300);
await clickText("Nouvelle commande", "button");
await page.waitForTimeout(300);
await clickText("Fatou", "button"); // sélectionne le client dans la liste
await page.waitForTimeout(200);
await clickText("Suivant", "button");
await page.waitForTimeout(200);

// Étape 2 : modèle + tissu (seed data)
await page.selectOption("select >> nth=0", { index: 1 }).catch(() => {});
await page.selectOption("select >> nth=1", { index: 1 }).catch(() => {});
await page.fill('input[placeholder="Quantité utilisée (m)"]', "5");
await clickText("Suivant", "button");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "build/screenshot-p2-05-etape3-banniere-mesures.png") });

const texteEtape3 = await page.locator(".fdj-modal-in").innerText();
console.log("Bannière 'Reprendre ces mesures' visible ?", texteEtape3.includes("Reprendre ces mesures"));

await clickText("Reprendre ces mesures", "button");
await page.waitForTimeout(300);
const valeurTourTete = await page.locator('.fdj-modal-in input[type=number] >> nth=0').inputValue();
console.log("Valeur reprise pour le premier champ (attendu 56) :", valeurTourTete);

await page.screenshot({ path: path.join(root, "build/screenshot-p2-06-mesures-reprises.png") });

console.log("--- Logs navigateur ---");
logs.forEach((l) => console.log(l));

await browser.close();
server.close();

const erreurs = logs.filter((l) => l.startsWith("[pageerror]") || l.includes("PAGE_ERROR"));
if (erreurs.length > 0) {
  console.error(`ÉCHEC : ${erreurs.length} erreur(s) JS détectée(s).`);
  process.exit(1);
}
console.log("✓ Parcours Phase 2 (clients + mesures) exécuté sans erreur JS.");
