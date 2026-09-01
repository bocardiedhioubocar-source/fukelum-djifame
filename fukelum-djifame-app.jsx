import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingBag, Settings, Search, Plus, X,
  Check, AlertTriangle, Scissors, Ruler, ChevronRight, LogOut, Phone, Mail,
  MapPin, Calendar, Banknote, ImageOff, Loader2, Pencil, Trash2, ArrowLeft,
  Sparkles, ClipboardList, Wallet, RotateCcw, User as UserIcon
} from "lucide-react";

/* =========================================================================
   FUKELUM DJIFAME — Application de gestion (Back-office atelier de couture)
   Modules : Catalogue, Clients (CRM), Stock de tissus, Commandes, Atelier,
   Tableau de bord, Paramètres (rôles). Données synchronisées en temps réel
   via Firestore (un document par enregistrement — voir "Couche de données").
   ========================================================================= */

const ROLES = { ADMIN: "Administrateur", VENDEUSE: "Vendeuse", COUTURIERE: "Couturière" };
const SEUIL_DEFAUT = 10;

// Étapes de production, dans l'ordre. "En attente" = commande créée, pas encore
// démarrée. "Livrée" = étape finale (n'est jamais "en retard").
const STATUTS = ["En attente", "À couper", "En couture", "Essayage", "Retouches", "Prête", "Livrée"];
const STATUT_FINAL = "Livrée";
const STATUT_PRET = "Prête";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtMoney = (v) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(v) || 0)) + " F";
const fmtNumero = (n) => "CMD-" + String(n || 0).padStart(4, "0");

function toneStatut(statut) {
  if (statut === STATUT_FINAL) return "vert";
  if (statut === STATUT_PRET) return "vert";
  if (statut === "En attente") return "neutre";
  return "or";
}
function estEnRetard(c) {
  return !!c.dateLivraison && c.statut !== STATUT_FINAL && c.dateLivraison < todayStr();
}
function joursDeRetard(c) {
  if (!estEnRetard(c)) return 0;
  const a = new Date(c.dateLivraison + "T00:00:00");
  const b = new Date(todayStr() + "T00:00:00");
  return Math.max(0, Math.round((b - a) / 86400000));
}
function estAujourdhui(dateStr) {
  return dateStr === todayStr();
}
function prochainStatut(statutActuel) {
  const idx = STATUTS.indexOf(statutActuel);
  return STATUTS[Math.min(idx + 1, STATUTS.length - 1)];
}
async function avancerStatutCommande(ops, commande) {
  const suivant = prochainStatut(commande.statut);
  if (suivant === commande.statut) return suivant;
  await ops.update(commande.id, { statut: suivant, historique: [...(commande.historique || []), { statut: suivant, date: todayStr() }] });
  return suivant;
}

const LOGO_ENSEIGNE_B64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MDAgNDIwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQyMCI+CiAgPGRlZnM+CiAgICA8ZmlsdGVyIGlkPSJncmFpbiI+CiAgICAgIDxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjIiIHJlc3VsdD0ibiIgLz4KICAgICAgPGZlQ29sb3JNYXRyaXggaW49Im4iIHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgIDAgMCAwIDAgMCAgMCAwIDAgMCAwICAwIDAgMCAwLjAzNSAwIiAvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgoKICA8cmVjdCB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQyMCIgZmlsbD0iIzIxMWExNCIgLz4KCiAgPGcgdHJhbnNmb3JtPSJyb3RhdGUoLTEuMiAzNTAgMjEwKSI+CiAgICA8IS0tIHBsYW5jaGUgcGVpbnRlIDoga2FvbGluIC8gdGVycmUgLS0+CiAgICA8cmVjdCB4PSIzMCIgeT0iMzAiIHdpZHRoPSI2NDAiIGhlaWdodD0iMzYwIiByeD0iMTQiIGZpbGw9IiNFREUzRDAiIHN0cm9rZT0iIzJBMUYxNiIgc3Ryb2tlLXdpZHRoPSIxMCIgLz4KICAgIDxyZWN0IHg9IjQ0IiB5PSI0NCIgd2lkdGg9IjYxMiIgaGVpZ2h0PSIzMzIiIHJ4PSI4IiBmaWxsPSJub25lIiBzdHJva2U9IiNCNTY1MUQiIHN0cm9rZS13aWR0aD0iNCIgLz4KICAgIDxyZWN0IHg9IjU0IiB5PSI1NCIgd2lkdGg9IjU5MiIgaGVpZ2h0PSIzMTIiIHJ4PSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiNDOUExNUEiIHN0cm9rZS13aWR0aD0iMiIgLz4KCgogICAgPCEtLSBGVUtFTFVNIDogb21icmUgb2NyZS9sYXTDqXJpdGUgKyBsZXR0cmUgbm9pcmUgLS0+CiAgICA8dGV4dCB4PSIzNTQiIHk9IjE5NiIgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLCBBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSI5MiIKICAgICAgICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNCNTY1MUQiPkZVS0VMVU08L3RleHQ+CiAgICA8dGV4dCB4PSIzNTAiIHk9IjE5MiIgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLCBBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSI5MiIKICAgICAgICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMyQTFGMTYiPkZVS0VMVU08L3RleHQ+CgogICAgPCEtLSBESklGQU1FIDogb21icmUgbm9pcmUgKyBsZXR0cmUgb2NyZSAtLT4KICAgIDx0ZXh0IHg9IjM1NCIgeT0iMjgyIiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjgwIgogICAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzJBMUYxNiI+REpJRkFNRTwvdGV4dD4KICAgIDx0ZXh0IHg9IjM1MCIgeT0iMjc4IiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjgwIgogICAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0M2ODQxRiIgc3Ryb2tlPSIjMkExRjE2IiBzdHJva2Utd2lkdGg9IjEuNSI+REpJRkFNRTwvdGV4dD4KCiAgICA8bGluZSB4MT0iMTQwIiB5MT0iMzA4IiB4Mj0iNTYwIiB5Mj0iMzA4IiBzdHJva2U9IiNCNTY1MUQiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPgoKICAgIDx0ZXh0IHg9IjM1MCIgeT0iMzM2IiBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIGxldHRlci1zcGFjaW5nPSI0IgogICAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0I1NjUxRCIgZm9udC1zdHlsZT0iaXRhbGljIj5NYWlzb24gZGUgQ291dHVyZTwvdGV4dD4KICAgIDx0ZXh0IHg9IjM1MCIgeT0iMzU4IiBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGxldHRlci1zcGFjaW5nPSI1IgogICAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzJBMUYxNiI+REFLQVIgwrcgU8OJTsOJR0FMPC90ZXh0PgogIDwvZz4KCiAgPHJlY3Qgd2lkdGg9IjcwMCIgaGVpZ2h0PSI0MjAiIGZpbHRlcj0idXJsKCNncmFpbikiIC8+Cjwvc3ZnPgo=";
const LOGO_ENSEIGNE_DATA_URI = "data:image/svg+xml;base64," + LOGO_ENSEIGNE_B64;

/* --------------------------- Couche de données ---------------------------
   Chaque collection (catalogue, clients, stock, commandes, encaissements,
   employes) est stockée en un document Firestore PAR enregistrement, avec
   synchronisation temps réel (onSnapshot). C'est ce qui permet des mises à
   jour concurrentes fiables (ex. deux ventes sur le même tissu en même
   temps) — contrairement à l'ancienne version où chaque collection était un
   unique document JSON, réécrit en entier à chaque modification.

   Ancien format (fdj_data/fdj-*, un blob JSON par collection) conservé en
   lecture seule uniquement pour la migration automatique au premier
   chargement — voir migrerOuInitialiserDonnees(). Il n'est plus jamais écrit. */

const ANCIENNES_CLES = {
  catalogue: "fdj-catalogue",
  clients: "fdj-clients",
  stock: "fdj-stock",
  commandes: "fdj-commandes",
  encaissements: "fdj-encaissements",
  employes: "fdj-employes",
};

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    if (res && typeof res.value === "string") return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}

function fdjDb() {
  return typeof window !== "undefined" ? window.__fdjDb : undefined;
}

// Stores de repli en mémoire — utilisés uniquement quand Firestore est
// indisponible (tests locaux, mode dégradé hors-ligne). Non partagés entre
// appareils, contrairement aux collections Firestore.
const memoryStores = {};
function memoryStore(name) {
  if (!memoryStores[name]) memoryStores[name] = { items: [], listeners: [] };
  return memoryStores[name];
}

function makeCollectionStore(name) {
  const db = fdjDb();
  if (db) {
    const col = db.collection(name);
    return {
      subscribe(cb) {
        return col.onSnapshot(
          (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => {
            console.error(`Firestore(${name}) — erreur de synchronisation :`, err);
            window.__fdjCloudConnected = false;
          }
        );
      },
      async add(item) {
        const id = item.id || uid();
        await col.doc(id).set({ ...item, id });
        return id;
      },
      async update(id, patch) { await col.doc(id).set(patch, { merge: true }); },
      async remove(id) { await col.doc(id).delete(); },
    };
  }
  // Repli local (mémoire du navigateur, non partagé).
  const store = memoryStore(name);
  function emit() { store.listeners.forEach((l) => l(store.items.slice())); }
  return {
    subscribe(cb) {
      store.listeners.push(cb);
      emit();
      return () => { store.listeners = store.listeners.filter((l) => l !== cb); };
    },
    async add(item) {
      const id = item.id || uid();
      store.items = [...store.items, { ...item, id }];
      emit();
      return id;
    },
    async update(id, patch) {
      store.items = store.items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      emit();
    },
    async remove(id) {
      store.items = store.items.filter((x) => x.id !== id);
      emit();
    },
  };
}

// Migration (une seule fois, verrouillée par transaction) : reprend les
// anciens blobs s'ils existent, sinon amorce les données d'exemple — jamais
// les deux, pour ne pas faire croire à une migration déjà faite alors que ce
// n'est qu'un jeu d'exemple qui vient d'être créé.
async function migrerOuInitialiserDonnees() {
  const db = fdjDb();
  const seeds = {
    catalogue: SEED_CATALOGUE, clients: SEED_CLIENTS, stock: SEED_STOCK,
    commandes: [], encaissements: [], employes: SEED_EMPLOYES,
  };

  if (!db) {
    for (const [collection, seed] of Object.entries(seeds)) {
      const store = memoryStore(collection);
      if (store.items.length === 0 && seed.length > 0) store.items = seed.map((it) => ({ ...it }));
    }
    return;
  }

  const metaRef = db.collection("fdj_meta").doc("migration");
  let doitTraiter = false;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(metaRef);
      if (snap.exists) return;
      doitTraiter = true;
      tx.set(metaRef, { status: "en-cours", startedAt: Date.now() });
    });
  } catch (e) {
    console.error("Initialisation des données — verrou indisponible :", e);
    return;
  }
  if (!doitTraiter) return;

  try {
    let elementsMigres = 0;
    for (const [collection, ancienneCle] of Object.entries(ANCIENNES_CLES)) {
      const snapshotActuel = await db.collection(collection).limit(1).get();
      if (!snapshotActuel.empty) continue; // déjà des données ici, on ne touche à rien
      const ancien = await loadKey(ancienneCle, null);
      const batch = db.batch();
      if (Array.isArray(ancien) && ancien.length > 0) {
        ancien.forEach((item) => {
          const id = item.id || uid();
          batch.set(db.collection(collection).doc(id), { ...item, id });
        });
        elementsMigres += ancien.length;
      } else if (seeds[collection].length > 0) {
        seeds[collection].forEach((item) => batch.set(db.collection(collection).doc(item.id), item));
      } else {
        continue;
      }
      await batch.commit();
    }
    const commandesSnap = await db.collection("commandes").get();
    if (commandesSnap.size > 0) {
      await db.collection("compteurs").doc("commandes").set({ suivant: commandesSnap.size + 1 }, { merge: true });
    }
    await metaRef.set({ status: "termine", finishedAt: Date.now(), elements: elementsMigres }, { merge: true });
    if (elementsMigres > 0) console.log(`Migration Firestore terminée — ${elementsMigres} éléments repris de l'ancien format.`);
  } catch (e) {
    console.error("Initialisation des données — erreur, nouvelle tentative au prochain chargement :", e);
    await metaRef.delete().catch(() => {});
  }
}

// Création atomique d'une commande : vérifie et déduit le stock, attribue un
// numéro de commande séquentiel, dans une seule transaction Firestore. Deux
// ventes simultanées sur le même tissu ne peuvent plus s'écraser l'une
// l'autre (contrairement à l'ancienne version, où tout le stock était réécrit
// en bloc à chaque commande).
async function creerCommandeAtomique(payload) {
  const { tissuId, quantiteTissu, avance, ...reste } = payload;
  const qte = Number(quantiteTissu) || 0;
  const db = fdjDb();
  const id = uid();

  if (db) {
    const compteurRef = db.collection("compteurs").doc("commandes");
    const stockRef = tissuId ? db.collection("stock").doc(tissuId) : null;
    const commandeRef = db.collection("commandes").doc(id);
    const numero = await db.runTransaction(async (tx) => {
      const compteurSnap = await tx.get(compteurRef);
      const suivant = compteurSnap.exists ? Number(compteurSnap.data().suivant) || 1 : 1;
      if (stockRef) {
        const stockSnap = await tx.get(stockRef);
        if (!stockSnap.exists) throw new Error("Ce tissu n'existe plus — il a peut-être été supprimé entre-temps.");
        const dispo = Number(stockSnap.data().metrage) || 0;
        if (qte > dispo) throw new Error(`Stock insuffisant : ${dispo} m disponibles, ${qte} m demandés.`);
        tx.update(stockRef, { metrage: dispo - qte });
      }
      tx.set(commandeRef, {
        ...reste, id, tissuId: tissuId || "", quantiteTissu: qte, avance: Number(avance) || 0,
        numero: suivant, statut: STATUTS[0], dateCreation: todayStr(), historique: [{ statut: STATUTS[0], date: todayStr() }],
      });
      tx.set(compteurRef, { suivant: suivant + 1 }, { merge: true });
      if (Number(avance) > 0) {
        tx.set(db.collection("encaissements").doc(uid()), {
          id, commandeId: id, montant: Number(avance), type: "Acompte", date: todayStr(),
        });
      }
      return suivant;
    });
    return { id, numero };
  }

  // Repli local (pas de vraie concurrence à gérer hors Firestore).
  const stockStore = memoryStore("stock");
  if (tissuId) {
    const t = stockStore.items.find((x) => x.id === tissuId);
    if (!t) throw new Error("Ce tissu n'existe plus.");
    const dispo = Number(t.metrage) || 0;
    if (qte > dispo) throw new Error(`Stock insuffisant : ${dispo} m disponibles, ${qte} m demandés.`);
    stockStore.items = stockStore.items.map((x) => (x.id === tissuId ? { ...x, metrage: dispo - qte } : x));
    stockStore.listeners.forEach((l) => l(stockStore.items.slice()));
  }
  const commandeStore = memoryStore("commandes");
  const numero = commandeStore.items.length + 1;
  const commande = {
    ...reste, id, tissuId: tissuId || "", quantiteTissu: qte, avance: Number(avance) || 0,
    numero, statut: STATUTS[0], dateCreation: todayStr(), historique: [{ statut: STATUTS[0], date: todayStr() }],
  };
  commandeStore.items = [...commandeStore.items, commande];
  commandeStore.listeners.forEach((l) => l(commandeStore.items.slice()));
  if (Number(avance) > 0) {
    const encStore = memoryStore("encaissements");
    encStore.items = [...encStore.items, { id: uid(), commandeId: id, montant: Number(avance), type: "Acompte", date: todayStr() }];
    encStore.listeners.forEach((l) => l(encStore.items.slice()));
  }
  return { id, numero };
}

// Encaissement d'un paiement : met à jour la commande et ajoute la ligne
// d'historique dans la même transaction.
async function encaisserPaiementAtomique(commandeId, montant, type) {
  const montantNum = Number(montant) || 0;
  const db = fdjDb();

  if (db) {
    const commandeRef = db.collection("commandes").doc(commandeId);
    const encRef = db.collection("encaissements").doc(uid());
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(commandeRef);
      if (!snap.exists) throw new Error("Commande introuvable.");
      const c = snap.data();
      const reste = Number(c.resteAPayer) || 0;
      const verse = Math.max(0, Math.min(montantNum, reste));
      tx.update(commandeRef, { avance: (Number(c.avance) || 0) + verse, resteAPayer: reste - verse });
      tx.set(encRef, { id: encRef.id, commandeId, montant: verse, type: type || "Paiement", date: todayStr() });
      return verse;
    });
  }

  const commandeStore = memoryStore("commandes");
  const c = commandeStore.items.find((x) => x.id === commandeId);
  if (!c) throw new Error("Commande introuvable.");
  const reste = Number(c.resteAPayer) || 0;
  const verse = Math.max(0, Math.min(montantNum, reste));
  commandeStore.items = commandeStore.items.map((x) =>
    x.id === commandeId ? { ...x, avance: (Number(x.avance) || 0) + verse, resteAPayer: reste - verse } : x
  );
  commandeStore.listeners.forEach((l) => l(commandeStore.items.slice()));
  const encStore = memoryStore("encaissements");
  const enc = { id: uid(), commandeId, montant: verse, type: type || "Paiement", date: todayStr() };
  encStore.items = [...encStore.items, enc];
  encStore.listeners.forEach((l) => l(encStore.items.slice()));
  return verse;
}

const SEED_CATALOGUE = [
  { id: uid(), nom: "Queen Dress", categorie: "Robes", prix: 45000, photoUrl: "", description: "Robe de soirée cintrée, coupe sirène." },
  { id: uid(), nom: "Ensemble Awa", categorie: "Ensembles", prix: 38000, photoUrl: "", description: "Ensemble deux pièces, taille haute." },
];
const SEED_STOCK = [
  { id: uid(), nom: "Bazin riche", couleur: "Bleu roi", metrage: 42, prixAchat: 3500, seuil: SEUIL_DEFAUT },
  { id: uid(), nom: "Wax", couleur: "Jaune moutarde", metrage: 8, prixAchat: 2500, seuil: SEUIL_DEFAUT },
];
const SEED_CLIENTS = [
  { id: uid(), nom: "Koffi", prenom: "Aminata", genre: "Femme", telephone: "07 00 00 00 00", email: "", adresse: "Cocody, Angré", dateCreation: todayStr() },
];
const SEED_EMPLOYES = [
  { id: uid(), nom: "Bocar", email: "diedhiouyayabocar@gmail.com", role: ROLES.ADMIN },
  { id: uid(), nom: "Famara", email: "famaradiedhiou1010@gmail.com", role: ROLES.ADMIN },
];

/* ------------------------------- UI atoms ------------------------------- */

function Btn({ children, variant = "solid", className = "", style = {}, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    solid: { background: "var(--noir)", color: "var(--creme)" },
    or: { background: "var(--or)", color: "var(--noir)" },
    ghost: { background: "transparent", color: "var(--noir)", border: "1px solid var(--ligne)" },
    danger: { background: "var(--bordeaux)", color: "#fff" },
  };
  return (
    <button className={base + " btn-" + variant + " " + className} style={{ ...styles[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, tone = "neutre" }) {
  const tones = {
    neutre: { background: "var(--gris-clair)", color: "var(--noir)" },
    or: { background: "var(--or-pale)", color: "#6b4e12" },
    vert: { background: "#e4ead9", color: "var(--sauge-txt)" },
    rouge: { background: "#f2dede", color: "var(--bordeaux)" },
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={tones[tone]}>
      {children}
    </span>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--gris-fonce)" }}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: "var(--gris-fonce)" }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid var(--ligne)",
  borderRadius: "6px",
  padding: "8px 10px",
  fontSize: "14px",
  background: "#fff",
  color: "var(--noir)",
  fontFamily: "var(--font-mono)",
};

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={"outline-none focus:ring-2 " + (props.className || "")} />;
}
function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={"outline-none focus:ring-2 " + (props.className || "")} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, fontFamily: "var(--font-body)", ...(props.style || {}) }} className={"outline-none focus:ring-2 " + (props.className || "")} />;
}

function Card({ children, className = "", style = {}, hover = false, ...rest }) {
  return (
    <div className={"rounded-lg fdj-card " + (hover ? "fdj-card-hover " : "") + className} style={{ background: "#fff", border: "1px solid var(--ligne)", ...style }} {...rest}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fdj-overlay-in" style={{ background: "rgba(23,20,15,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-lg overflow-hidden fdj-modal-in"
        style={{ maxWidth: wide ? "720px" : "460px", maxHeight: "88vh", background: "var(--creme)", border: "1px solid var(--ligne)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--noir)", color: "var(--creme)" }}>
          <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(88vh - 58px)" }}>{children}</div>
      </div>
    </div>
  );
}

function Ruban() {
  return (
    <div className="flex items-center gap-1 my-4" aria-hidden="true">
      <Ruler size={13} style={{ color: "var(--or)" }} />
      <div style={{ flex: 1, height: "1px", backgroundImage: "repeating-linear-gradient(90deg, var(--or) 0 6px, transparent 6px 12px)" }} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Icon size={30} style={{ color: "var(--or)" }} />
      <p className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "17px" }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: "var(--gris-fonce)", maxWidth: "360px" }}>{sub}</p>
    </div>
  );
}

/* ------------------------------- App root ------------------------------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(undefined); // undefined = en cours de vérification, null = déconnecté
  const [tab, setTab] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [catalogue, setCatalogue] = useState([]);
  const [clients, setClients] = useState([]);
  const [stock, setStock] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [encaissements, setEncaissements] = useState([]);
  const [employes, setEmployes] = useState([]);

  useEffect(() => {
    if (window.__fdjAuth && typeof window.__fdjAuth.onAuthStateChanged === "function") {
      return window.__fdjAuth.onAuthStateChanged((user) => setAuthUser(user || null));
    }
    setAuthUser(null); // pas d'authentification disponible (ex. environnement sans Firebase) : accès libre non applicable ici
  }, []);

  // Un store par collection (add/update/remove + abonnement temps réel). Créés
  // une seule fois pour toute la durée de vie du composant.
  const stores = useMemo(() => ({
    catalogue: makeCollectionStore("catalogue"),
    clients: makeCollectionStore("clients"),
    stock: makeCollectionStore("stock"),
    commandes: makeCollectionStore("commandes"),
    encaissements: makeCollectionStore("encaissements"),
    employes: makeCollectionStore("employes"),
  }), []);

  useEffect(() => {
    let cancelled = false;
    let unsubs = [];
    const setters = {
      catalogue: setCatalogue, clients: setClients, stock: setStock,
      commandes: setCommandes, encaissements: setEncaissements, employes: setEmployes,
    };
    (async () => {
      await migrerOuInitialiserDonnees();
      if (cancelled) return;
      const names = Object.keys(stores);
      let pending = names.length;
      unsubs = names.map((name) =>
        stores[name].subscribe((items) => {
          setters[name](items);
          if (pending > 0) { pending--; if (pending === 0 && !cancelled) setLoading(false); }
        })
      );
    })();
    return () => { cancelled = true; unsubs.forEach((u) => u && u()); };
  }, [stores]); // eslint-disable-line

  async function reinitialiserDonneesDemo() {
    await Promise.all(commandes.map((c) => stores.commandes.remove(c.id)));
    await Promise.all(encaissements.map((e) => stores.encaissements.remove(e.id)));
    await Promise.all(catalogue.map((m) => stores.catalogue.remove(m.id)));
    await Promise.all(clients.map((c) => stores.clients.remove(c.id)));
    await Promise.all(stock.map((t) => stores.stock.remove(t.id)));
    await Promise.all(SEED_CATALOGUE.map((item) => stores.catalogue.add(item)));
    await Promise.all(SEED_CLIENTS.map((item) => stores.clients.add(item)));
    await Promise.all(SEED_STOCK.map((item) => stores.stock.add(item)));
  }

  if (loading || authUser === undefined) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-full py-24">
          <Loader2 className="animate-spin" size={26} style={{ color: "var(--or)" }} />
        </div>
      </Shell>
    );
  }

  if (!authUser) {
    return (
      <Shell>
        <Login />
      </Shell>
    );
  }

  const employeCorrespondant = employes.find(
    (e) => (e.email || "").toLowerCase().trim() === (authUser.email || "").toLowerCase().trim()
  );

  if (!employeCorrespondant) {
    return (
      <Shell>
        <AccesRefuse email={authUser.email} onLogout={() => window.__fdjAuth && window.__fdjAuth.signOut()} />
      </Shell>
    );
  }

  const session = { role: employeCorrespondant.role, nom: employeCorrespondant.nom, email: authUser.email };

  const nav = navForRole(session.role);
  if (!nav.find((n) => n.key === tab)) {
    // reset tab if not permitted for this role
  }

  return (
    <Shell>
      <div className="flex flex-col md:flex-row h-full" style={{ minHeight: "640px" }}>
        <div className="flex md:hidden items-center justify-between p-3" style={{ background: "var(--noir)", color: "var(--creme)" }}>
          <button onClick={() => setMobileNavOpen(true)} aria-label="Menu" style={{ fontSize: "22px", lineHeight: 1, color: "var(--creme)" }}>☰</button>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "17px" }}>Fukelum Djifame</p>
          <span style={{ width: "22px" }} />
        </div>
        <Sidebar
          nav={nav} tab={tab} setTab={setTab} session={session}
          mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)}
          onLogout={() => { window.__fdjAuth && window.__fdjAuth.signOut(); setTab("dashboard"); }}
        />
        <main className="flex-1 overflow-y-auto p-5 md:p-7" style={{ background: "var(--creme)" }}>
          <div key={tab} className="fdj-fade-in">
          {tab === "dashboard" && (
            <Dashboard
              session={session} commandes={commandes} catalogue={catalogue} clients={clients}
              stock={stock} encaissements={encaissements} setTab={setTab}
            />
          )}
          {tab === "catalogue" && (
            <Catalogue catalogue={catalogue} ops={stores.catalogue} readOnly={session.role !== ROLES.ADMIN} />
          )}
          {tab === "clients" && (
            <Clients clients={clients} ops={stores.clients} commandes={commandes} catalogue={catalogue} />
          )}
          {tab === "stock" && (
            <Stock stock={stock} ops={stores.stock} />
          )}
          {tab === "commandes" && (
            <Commandes
              session={session} commandes={commandes} commandesOps={stores.commandes}
              clients={clients} clientsOps={stores.clients} catalogue={catalogue}
              stock={stock} encaissements={encaissements}
            />
          )}
          {tab === "atelier" && (
            <Atelier commandes={commandes} commandesOps={stores.commandes} catalogue={catalogue} clients={clients} />
          )}
          {tab === "parametres" && (
            <Parametres
              employes={employes} ops={stores.employes}
              onReset={async () => {
                if (!confirm("Réinitialiser toutes les données de démonstration ? Cette action est irréversible : commandes, clients, catalogue et stock actuels seront supprimés.")) return;
                await reinitialiserDonneesDemo();
              }}
            />
          )}
          </div>
        </main>
      </div>
    </Shell>
  );
}

function toastFdj(message) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fdj-toast", { detail: message }));
  }
}

function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    function onToast(e) {
      const id = uid();
      setToasts((t) => [...t, { id, message: e.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    }
    window.addEventListener("fdj-toast", onToast);
    return () => window.removeEventListener("fdj-toast", onToast);
  }, []);
  return (
    <div style={{ position: "fixed", bottom: "22px", left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
      {toasts.map((t) => (
        <div key={t.id} className="fdj-fade-in" style={{ background: "var(--noir)", color: "var(--creme)", padding: "10px 18px", borderRadius: "8px", fontSize: "13.5px", boxShadow: "0 8px 22px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
          <Check size={15} style={{ color: "var(--or-clair)" }} /> {t.message}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{
      "--noir": "#2A1F16", "--or": "#B5651D", "--or-clair": "#C6841F", "--or-pale": "#F1E4C9",
      "--creme": "#F8F4EC", "--bordeaux": "#8B3A2B", "--sauge": "#6B7A5E", "--sauge-txt": "#4C5A3F",
      "--gris-clair": "#F0E8D8", "--gris-fonce": "#6E6152", "--ligne": "#E3D8C4",
      "--font-display": "'Playfair Display', Georgia, serif",
      "--font-body": "'Inter', system-ui, sans-serif",
      "--font-mono": "'IBM Plex Mono', monospace",
      fontFamily: "var(--font-body)", color: "var(--noir)", minHeight: "640px", height: "100%",
      background: "var(--creme)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--or-clair); border-radius: 8px; }
        input, select, textarea, button { transition: box-shadow .15s ease, border-color .15s ease, background-color .15s ease, transform .1s ease; }
        input:focus, select:focus, textarea:focus { box-shadow: 0 0 0 3px var(--or-pale); border-color: var(--or) !important; outline: none; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gris-fonce); padding: 8px 10px; border-bottom: 1px solid var(--ligne); }
        td { padding: 10px; border-bottom: 1px solid var(--ligne); font-size: 14px; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tbody tr { transition: background-color .12s ease; }
        tbody tr:hover { background-color: var(--gris-clair); }

        .fdj-card { box-shadow: 0 1px 3px rgba(42,31,22,0.05); transition: box-shadow .2s ease, transform .2s ease; }
        .fdj-card.fdj-card-hover:hover { box-shadow: 0 10px 24px rgba(42,31,22,0.10); transform: translateY(-2px); }

        .btn-solid:hover:not(:disabled), .btn-or:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .btn-ghost:hover:not(:disabled) { background: var(--gris-clair) !important; }
        .btn-solid:active:not(:disabled), .btn-or:active:not(:disabled), .btn-ghost:active:not(:disabled) { transform: translateY(0); filter: brightness(0.97); }

        @keyframes fdjFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fdj-fade-in { animation: fdjFadeUp .28s ease; }

        @keyframes fdjModalIn { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .fdj-modal-in { animation: fdjModalIn .18s ease; }

        @keyframes fdjOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        .fdj-overlay-in { animation: fdjOverlayIn .15s ease; }

        aside button { transition: background-color .15s ease, color .15s ease, transform .1s ease; }
        .fdj-nav-btn:hover { background: rgba(181,101,29,0.12) !important; }
      `}</style>
      {typeof window !== "undefined" && window.__fdjStockagePersistant === false && (
        <div style={{ background: "var(--bordeaux)", color: "#fff", fontSize: "12px", textAlign: "center", padding: "6px 10px" }}>
          Stockage temporaire actif (navigation privée ou réglages du navigateur) — les données ne seront pas conservées après la fermeture de cet onglet.
        </div>
      )}
      {typeof window !== "undefined" && window.__fdjCloudConnected === false && (
        <div style={{ background: "var(--bordeaux)", color: "#fff", fontSize: "12px", textAlign: "center", padding: "6px 10px" }}>
          Connexion au cloud impossible — vérifiez votre connexion internet. Les données ne seront pas synchronisées avec votre collaborateur tant que la connexion n'est pas rétablie.
        </div>
      )}
      {children}
      <ToastHost />
    </div>
  );
}

function navForRole(role) {
  const all = [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "commandes", label: "Commandes", icon: ShoppingBag },
    { key: "atelier", label: "Atelier", icon: Scissors },
    { key: "catalogue", label: "Catalogue", icon: Sparkles },
    { key: "clients", label: "Clients", icon: Users },
    { key: "stock", label: "Stock de tissus", icon: Package },
    { key: "parametres", label: "Paramètres", icon: Settings },
  ];
  if (role === ROLES.ADMIN) return all;
  if (role === ROLES.VENDEUSE) return all.filter((n) => ["dashboard", "commandes", "catalogue", "clients"].includes(n.key));
  if (role === ROLES.COUTURIERE) return all.filter((n) => ["atelier"].includes(n.key));
  return all;
}

/* --------------------------------- Login --------------------------------- */

function traduireErreurAuth(code) {
  const map = {
    "auth/invalid-email": "Adresse email invalide.",
    "auth/user-not-found": "Aucun compte pour cet email — essayez « Créer un compte ».",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/email-already-in-use": "Un compte existe déjà pour cet email — essayez « Se connecter ».",
    "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
    "auth/too-many-requests": "Trop de tentatives, réessayez dans quelques minutes.",
    "auth/network-request-failed": "Connexion internet impossible.",
  };
  return map[code] || "Une erreur est survenue. Réessayez.";
}

function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const authDisponible = typeof window !== "undefined" && window.__fdjAuth;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!authDisponible) { setError("Connexion au service d'authentification indisponible — vérifiez votre connexion internet."); return; }
    setLoading(true);
    try {
      if (mode === "signin") await window.__fdjAuth.signIn(email.trim(), password);
      else await window.__fdjAuth.signUp(email.trim(), password);
    } catch (err) {
      setError(traduireErreurAuth(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 fdj-fade-in" style={{ minHeight: "640px" }}>
      <img src={LOGO_ENSEIGNE_DATA_URI} alt="Fukelum Djifame"
        style={{ width: "260px", maxWidth: "85%", borderRadius: "10px", boxShadow: "0 14px 34px rgba(42,31,22,0.18)", marginBottom: "22px" }} />
      <p className="text-sm mb-8" style={{ color: "var(--gris-fonce)" }}>Connectez-vous pour accéder à votre espace de travail</p>

      <Card className="w-full max-w-sm p-6">
        <div className="flex gap-2 mb-4">
          {[["signin", "Se connecter"], ["signup", "Créer un compte"]].map(([m, label]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
              className="flex-1 rounded-md text-sm font-medium" style={{ padding: "8px 10px", border: "1px solid var(--ligne)", background: mode === m ? "var(--noir)" : "#fff", color: mode === m ? "var(--creme)" : "var(--noir)" }}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={submit}>
          <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Mot de passe" hint={mode === "signup" ? "Au moins 6 caractères. Ce mot de passe est propre à l'application." : undefined}>
            <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-xs mb-3" style={{ color: "var(--bordeaux)" }}>{error}</p>}
          <Btn type="submit" variant="or" className="w-full" disabled={loading || !email || !password}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : (mode === "signin" ? "Se connecter" : "Créer mon compte")}
          </Btn>
        </form>
      </Card>
      <p className="text-xs mt-6" style={{ color: "var(--gris-fonce)" }}>Votre accès (rôle) doit avoir été configuré par un administrateur au préalable.</p>
    </div>
  );
}

function AccesRefuse({ email, onLogout }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center" style={{ minHeight: "640px" }}>
      <p className="text-xs uppercase mb-2" style={{ color: "var(--or)", letterSpacing: "0.3em" }}>Maison de Couture</p>
      <h1 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "var(--noir)" }}>Accès non configuré</h1>
      <Card className="w-full max-w-sm p-6">
        <p className="text-sm mb-4" style={{ color: "var(--gris-fonce)" }}>
          L'adresse <strong style={{ color: "var(--noir)" }}>{email}</strong> n'est associée à aucun poste dans l'atelier.
          Demandez à un administrateur de l'ajouter dans <strong>Paramètres → Employés</strong>.
        </p>
        <Btn variant="ghost" className="w-full" onClick={onLogout}>Se déconnecter</Btn>
      </Card>
    </div>
  );
}

/* -------------------------------- Sidebar -------------------------------- */

function Sidebar({ nav, tab, setTab, session, onLogout, mobileOpen, onCloseMobile }) {
  const contenu = (
    <>
      <div className="mb-8">
        <p className="uppercase" style={{ color: "var(--or)", fontSize: "10px", letterSpacing: "0.3em" }}>Maison de Couture</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "21px" }}>Fukelum<br />Djifame</p>
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        {nav.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); onCloseMobile && onCloseMobile(); }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-left transition-colors fdj-nav-btn"
            style={{ background: tab === key ? "rgba(181,101,29,0.22)" : "transparent", color: tab === key ? "var(--or-clair)" : "var(--creme)" }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <p className="text-xs" style={{ color: "var(--gris-fonce)" }}>Connecté(e) comme</p>
        <p className="text-sm font-semibold mb-3">{session.nom} · {session.role}</p>
        <button onClick={onLogout} className="flex items-center gap-2 text-xs" style={{ color: "var(--or-clair)" }}>
          <LogOut size={13} /> Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 shrink-0 p-5" style={{ background: "var(--noir)", color: "var(--creme)" }}>
        {contenu}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50" style={{ display: "flex" }}>
          <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCloseMobile} />
          <aside className="flex flex-col w-60 p-5" style={{ position: "relative", background: "var(--noir)", color: "var(--creme)", height: "100%", overflowY: "auto" }}>
            <button onClick={onCloseMobile} className="mb-4" style={{ alignSelf: "flex-end", color: "var(--creme)" }}>
              <X size={20} />
            </button>
            {contenu}
          </aside>
        </div>
      )}
    </>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

function ligneATraiter(c, client, modele, kind) {
  const infos = {
    retard: { icon: "🔴", label: `En retard (${joursDeRetard(c)} j)` },
    livraison: { icon: "🔴", label: "Livraison aujourd'hui" },
    essayage: { icon: "🟠", label: "Essayage prévu" },
    prete: { icon: "🟢", label: "Prête à livrer" },
  }[kind];
  return { commande: c, client, modele, kind, ...infos };
}

function Dashboard({ session, commandes, catalogue, clients, stock, encaissements, setTab }) {
  const today = todayStr();
  const isAdmin = session.role === ROLES.ADMIN;
  const moisCourant = today.slice(0, 7); // "YYYY-MM"

  const caJour = encaissements.filter((e) => e.date === today).reduce((s, e) => s + Number(e.montant || 0), 0);
  const caMois = encaissements.filter((e) => (e.date || "").startsWith(moisCourant)).reduce((s, e) => s + Number(e.montant || 0), 0);
  const commandesMois = commandes.filter((c) => (c.dateCreation || "").startsWith(moisCourant));
  const panierMoyen = commandesMois.length > 0 ? commandesMois.reduce((s, c) => s + Number(c.prixTotal || 0), 0) / commandesMois.length : 0;

  const enProduction = commandes.filter((c) => c.statut !== "En attente" && c.statut !== STATUT_FINAL && c.statut !== STATUT_PRET).length;
  const pretes = commandes.filter((c) => c.statut === STATUT_PRET).length;
  const critiques = stock.filter((t) => Number(t.metrage) < Number(t.seuil || SEUIL_DEFAUT));

  function trouver(c) {
    return { client: clients.find((x) => x.id === c.clientId), modele: catalogue.find((x) => x.id === c.modeleId) };
  }

  // "À faire aujourd'hui" : une commande peut apparaître dans plusieurs catégories
  // (ex. en retard ET impayée) — chaque ligne est une action concrète à traiter.
  const aTraiter = [];
  commandes.forEach((c) => {
    if (c.statut === STATUT_FINAL) return;
    const { client, modele } = trouver(c);
    if (estEnRetard(c)) aTraiter.push(ligneATraiter(c, client, modele, "retard"));
    else if (estAujourdhui(c.dateLivraison)) aTraiter.push(ligneATraiter(c, client, modele, "livraison"));
    else if (c.statut === "Essayage") aTraiter.push(ligneATraiter(c, client, modele, "essayage"));
    else if (c.statut === STATUT_PRET) aTraiter.push(ligneATraiter(c, client, modele, "prete"));
  });
  const ordreKind = { retard: 0, livraison: 1, essayage: 2, prete: 3 };
  aTraiter.sort((a, b) => ordreKind[a.kind] - ordreKind[b.kind]);

  const impayees = isAdmin ? commandes.filter((c) => c.statut !== STATUT_FINAL && Number(c.resteAPayer) > 0).slice(0, 5) : [];

  return (
    <div>
      <Header title="Tableau de bord" sub={`Bonjour ${session.nom} — aujourd'hui, ${fmtDate(today)}.`} />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))" }}>
        {isAdmin && <StatCard icon={Wallet} label="CA du jour" value={fmtMoney(caJour)} tone="or" />}
        {isAdmin && <StatCard icon={Wallet} label="CA du mois" value={fmtMoney(caMois)} tone="or" />}
        <StatCard icon={ShoppingBag} label="Commandes ce mois-ci" value={commandesMois.length} tone="neutre" />
        {isAdmin && <StatCard icon={Banknote} label="Panier moyen" value={fmtMoney(panierMoyen)} tone="neutre" />}
        <StatCard icon={Scissors} label="En production" value={enProduction} tone="neutre" />
        <StatCard icon={Check} label="Prêtes à livrer" value={pretes} tone="vert" />
      </div>

      {/* À faire aujourd'hui */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}>À faire aujourd'hui</h3>
      </div>
      <Card className="mb-6">
        {aTraiter.length === 0 ? (
          <EmptyState icon={Check} title="Rien d'urgent" sub="Aucune livraison, retard ou essayage à traiter aujourd'hui." />
        ) : (
          <div>
            {aTraiter.map((l, i) => (
              <button
                key={l.commande.id + l.label} onClick={() => setTab("commandes")}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                style={{ borderBottom: i < aTraiter.length - 1 ? "1px solid var(--ligne)" : "none" }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span>{l.icon}</span>
                  <span className="truncate">
                    <strong>{l.client ? `${l.client.prenom} ${l.client.nom}` : "Client"}</strong> — {l.modele?.nom || "Modèle"}
                    <span className="block text-xs" style={{ color: "var(--gris-fonce)" }}>{l.label} · {fmtNumero(l.commande.numero)}</span>
                  </span>
                </span>
                <ChevronRight size={16} style={{ color: "var(--gris-fonce)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {isAdmin && impayees.length > 0 && (
        <>
          <h3 className="font-semibold mb-3" style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}>Paiements en attente</h3>
          <Card className="mb-6">
            {impayees.map((c, i) => {
              const { client } = trouver(c);
              return (
                <button key={c.id} onClick={() => setTab("commandes")} className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ borderBottom: i < impayees.length - 1 ? "1px solid var(--ligne)" : "none" }}>
                  <span>{client ? `${client.prenom} ${client.nom}` : "Client"} · {fmtNumero(c.numero)}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--bordeaux)", fontWeight: 600 }}>{fmtMoney(c.resteAPayer)}</span>
                </button>
              );
            })}
          </Card>
        </>
      )}

      {isAdmin && critiques.length > 0 && (
        <Card className="p-4 mb-6" style={{ borderColor: "var(--bordeaux)" }}>
          <p className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "var(--bordeaux)" }}>
            <AlertTriangle size={15} /> Stock de tissus sous le seuil critique
          </p>
          <div className="flex flex-wrap gap-2">
            {critiques.map((t) => (
              <Badge key={t.id} tone="rouge">{t.nom} — {t.couleur} · {t.metrage} m restants</Badge>
            ))}
          </div>
        </Card>
      )}

      <Btn variant="or" onClick={() => setTab("commandes")}><Plus size={15} /> Nouvelle commande</Btn>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const bg = { or: "var(--or-pale)", vert: "#e4ead9", rouge: "#f2dede", neutre: "#fff" }[tone];
  return (
    <Card className="p-4" style={{ background: bg }}>
      <Icon size={16} style={{ color: "var(--noir)" }} />
      <p className="text-2xl font-semibold mt-2" style={{ fontFamily: "var(--font-mono)" }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "var(--gris-fonce)" }}>{label}</p>
    </Card>
  );
}

function StatutBadge({ statut }) {
  return <Badge tone={toneStatut(statut)}>{statut}</Badge>;
}

function Header({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px" }}>{title}</h2>
        {sub && <p className="text-sm mt-1" style={{ color: "var(--gris-fonce)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- Catalogue -------------------------------- */

function Catalogue({ catalogue, ops, readOnly }) {
  const [editing, setEditing] = useState(null); // model or {} for new
  const [q, setQ] = useState("");
  const [viewPhoto, setViewPhoto] = useState(null);

  const filtered = catalogue.filter((m) => (m.nom + m.categorie).toLowerCase().includes(q.toLowerCase()));

  function save(model) {
    if (model.id) ops.update(model.id, model);
    else ops.add({ ...model, id: uid() });
    setEditing(null);
    toastFdj("Modèle enregistré ✓");
  }
  function remove(id) {
    if (confirm("Supprimer ce modèle du catalogue ?")) ops.remove(id);
  }

  return (
    <div>
      <Header title="Catalogue de modèles" sub="La galerie numérique remplace le carnet de dessins papier."
        action={!readOnly && <Btn variant="or" onClick={() => setEditing({})}><Plus size={15} /> Ajouter un modèle</Btn>} />

      <div className="mb-4 flex items-center gap-2 max-w-sm">
        <Search size={15} style={{ color: "var(--gris-fonce)" }} />
        <Input placeholder="Rechercher un modèle ou une catégorie" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="Aucun modèle" sub="Ajoutez vos premiers modèles pour les retrouver lors de la prise de commande." />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))" }}>
          {filtered.map((m) => (
            <Card key={m.id} className="overflow-hidden" hover>
              <div className="relative cursor-pointer" style={{ aspectRatio: "3 / 4", background: "var(--gris-clair)" }}
                onClick={() => m.photoUrl && setViewPhoto(m)}>
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt={m.nom} className="w-full h-full object-cover" style={{ position: "absolute", inset: 0 }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ position: "absolute", inset: 0 }}>
                    <ImageOff size={22} style={{ color: "var(--gris-fonce)" }} />
                  </div>
                )}
                {!readOnly && (
                  <div className="absolute flex gap-1.5" style={{ top: "9px", right: "9px" }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditing(m); }}
                      className="flex items-center justify-center rounded-full" style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <Pencil size={13} style={{ color: "var(--noir)" }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                      className="flex items-center justify-center rounded-full" style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <Trash2 size={13} style={{ color: "var(--bordeaux)" }} />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs uppercase mb-1" style={{ color: "var(--gris-fonce)", letterSpacing: "0.05em" }}>{m.categorie || "Sans catégorie"}</p>
                <p className="font-medium mb-1.5" style={{ fontSize: "14px", color: "var(--noir)" }}>{m.nom}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmtMoney(m.prix)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setViewPhoto(null)}>
          <button onClick={() => setViewPhoto(null)} style={{ position: "absolute", top: "20px", right: "20px", color: "#fff" }}>
            <X size={26} />
          </button>
          <img src={viewPhoto.photoUrl} alt={viewPhoto.nom} style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px" }} />
        </div>
      )}

      {editing !== null && (
        <ModeleForm model={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function RecadrageModal({ file, aspect, onCancel, onConfirm }) {
  const [imgEl, setImgEl] = useState(null);
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const VW = 300;
  const VH = Math.round(VW / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const bs = Math.max(VW / img.width, VH / img.height);
      setBaseScale(bs);
      setScale(1);
      setPos({ x: (VW - img.width * bs) / 2, y: (VH - img.height * bs) / 2 });
      setImgEl(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]); // eslint-disable-line

  function clampPos(p, s) {
    if (!imgEl) return p;
    const dispW = imgEl.width * baseScale * s;
    const dispH = imgEl.height * baseScale * s;
    return {
      x: Math.min(0, Math.max(VW - dispW, p.x)),
      y: Math.min(0, Math.max(VH - dispH, p.y)),
    };
  }

  function onPointerDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origPos: pos };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clampPos({ x: dragRef.current.origPos.x + dx, y: dragRef.current.origPos.y + dy }, scale));
  }
  function onPointerUp() { dragRef.current = null; }

  function changerZoom(v) {
    setScale(v);
    setPos((p) => clampPos(p, v));
  }

  function confirmer() {
    const outW = 640;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d");
    const r = outW / VW;
    ctx.drawImage(imgEl, pos.x * r, pos.y * r, imgEl.width * baseScale * scale * r, imgEl.height * baseScale * scale * r);
    onConfirm(canvas.toDataURL("image/jpeg", 0.65));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,20,15,0.75)" }}>
      <div className="rounded-lg p-4" style={{ background: "var(--creme)", maxWidth: "360px", width: "100%" }}>
        <p className="text-sm font-semibold mb-1">Cadrer la photo</p>
        <p className="text-xs mb-3" style={{ color: "var(--gris-fonce)" }}>Faites glisser l'image pour la repositionner, utilisez le curseur pour zoomer.</p>
        {imgEl ? (
          <>
            <div
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
              style={{ width: VW, height: VH, overflow: "hidden", position: "relative", background: "#000", borderRadius: "8px", touchAction: "none", cursor: "grab", margin: "0 auto" }}
            >
              <img src={imgEl.src} alt="" draggable={false}
                style={{ position: "absolute", left: pos.x, top: pos.y, width: imgEl.width * baseScale * scale, height: imgEl.height * baseScale * scale, maxWidth: "none" }} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs" style={{ color: "var(--gris-fonce)" }}>Zoom</span>
              <input type="range" min="1" max="3" step="0.02" value={scale} onChange={(e) => changerZoom(Number(e.target.value))} style={{ flex: 1 }} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center" style={{ height: VH }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "var(--or)" }} />
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
          <Btn variant="or" disabled={!imgEl} onClick={confirmer}>Valider le cadrage</Btn>
        </div>
      </div>
    </div>
  );
}

function ModeleForm({ model, onCancel, onSave }) {
  const [f, setF] = useState({ nom: "", categorie: "", prix: "", photoUrl: "", description: "", ...model });
  const [fichierPhoto, setFichierPhoto] = useState(null);

  function choisirPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (file) setFichierPhoto(file);
    e.target.value = "";
  }

  return (
    <Modal title={model.id ? "Modifier le modèle" : "Ajouter un modèle"} onClose={onCancel}>
      <Field label="Nom du modèle"><Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Ex : Queen Dress" /></Field>
      <Field label="Catégorie"><Input value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} placeholder="Ex : Robes, Ensembles" /></Field>
      <Field label="Prix de vente (unique)"><Input type="number" value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} /></Field>

      <Field label="Photo du modèle" hint="Prenez une photo ou choisissez-la dans votre galerie, puis ajustez le cadrage.">
        <div className="flex items-center gap-3 mb-2">
          {f.photoUrl ? (
            <img src={f.photoUrl} alt="" className="rounded-md" style={{ width: "64px", height: "64px", objectFit: "cover", border: "1px solid var(--ligne)" }} />
          ) : (
            <div className="rounded-md flex items-center justify-center" style={{ width: "64px", height: "64px", background: "var(--gris-clair)" }}>
              <ImageOff size={18} style={{ color: "var(--gris-fonce)" }} />
            </div>
          )}
          <label className="rounded-md text-sm font-medium cursor-pointer" style={{ padding: "8px 14px", border: "1px solid var(--ligne)", background: "#fff" }}>
            {f.photoUrl ? "Changer la photo" : "Choisir une photo"}
            <input type="file" accept="image/*" onChange={choisirPhoto} style={{ display: "none" }} />
          </label>
          {f.photoUrl && (
            <button type="button" onClick={() => setF({ ...f, photoUrl: "" })} className="text-xs" style={{ color: "var(--bordeaux)" }}>Retirer</button>
          )}
        </div>
      </Field>

      <Field label="Description (facultatif)"><TextArea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!f.nom || !f.prix} onClick={() => onSave({ ...f, prix: Number(f.prix) })}>Enregistrer</Btn>
      </div>

      {fichierPhoto && (
        <RecadrageModal
          file={fichierPhoto}
          aspect={3 / 4}
          onCancel={() => setFichierPhoto(null)}
          onConfirm={(dataUrl) => { setF((prev) => ({ ...prev, photoUrl: dataUrl })); setFichierPhoto(null); }}
        />
      )}
    </Modal>
  );
}

/* -------------------------------- Clients --------------------------------- */

function Clients({ clients, ops, commandes, catalogue }) {
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");

  const filtered = clients.filter((c) => (c.nom + c.prenom + c.telephone).toLowerCase().includes(q.toLowerCase()));

  function save(client) {
    if (client.id) ops.update(client.id, client);
    else ops.add({ ...client, id: uid(), dateCreation: todayStr() });
    setEditing(null);
    toastFdj("Client enregistré ✓");
  }
  function remove(id) {
    if (confirm("Supprimer cette fiche client ?")) ops.remove(id);
  }

  return (
    <div>
      <Header title="Clients" sub="Fiche client, adresse complète et historique des commandes."
        action={<Btn variant="or" onClick={() => setEditing({})}><Plus size={15} /> Nouveau client</Btn>} />

      <div className="mb-4 flex items-center gap-2 max-w-sm">
        <Search size={15} style={{ color: "var(--gris-fonce)" }} />
        <Input placeholder="Rechercher un client" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card className="overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Aucun client" sub="Ajoutez votre premier client pour commencer une fiche mesures et un historique." />
        ) : (
          <table>
            <thead><tr><th>Client</th><th>Genre</th><th>Téléphone</th><th>Ville / Adresse</th><th>Commandes</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => setDetail(c)}>
                  <td className="font-medium">{c.prenom} {c.nom}</td>
                  <td><Badge tone={c.genre === "Homme" ? "neutre" : "or"}>{c.genre || "—"}</Badge></td>
                  <td>{c.telephone || "—"}</td>
                  <td>{c.adresse || "—"}</td>
                  <td>{commandes.filter((cmd) => cmd.clientId === c.id).length}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(c)}><Pencil size={13} style={{ color: "var(--gris-fonce)" }} /></button>
                      <button onClick={() => remove(c.id)}><Trash2 size={13} style={{ color: "var(--bordeaux)" }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing !== null && <ClientForm client={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {detail && (
        <Modal title={`${detail.prenom} ${detail.nom}`} onClose={() => setDetail(null)} wide>
          <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
            <p className="flex items-center gap-2"><Phone size={14} style={{ color: "var(--or)" }} /> {detail.telephone || "—"}</p>
            <p className="flex items-center gap-2"><Mail size={14} style={{ color: "var(--or)" }} /> {detail.email || "—"}</p>
            <p className="flex items-center gap-2 sm:col-span-2"><MapPin size={14} style={{ color: "var(--or)" }} /> {detail.adresse || "—"}</p>
          </div>
          <Ruban />
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--gris-fonce)" }}>Historique des commandes</p>
          {commandes.filter((c) => c.clientId === detail.id).length === 0 ? (
            <p className="text-sm" style={{ color: "var(--gris-fonce)" }}>Aucune commande pour ce client pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {commandes.filter((c) => c.clientId === detail.id).map((c) => {
                const modele = catalogue.find((m) => m.id === c.modeleId);
                return (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md" style={{ background: "var(--gris-clair)" }}>
                    <span className="text-sm font-medium">{modele?.nom || "Modèle supprimé"}</span>
                    <span className="text-xs" style={{ color: "var(--gris-fonce)" }}>{fmtDate(c.dateCreation)}</span>
                    <StatutBadge statut={c.statut} />
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function ClientForm({ client, onCancel, onSave }) {
  const [f, setF] = useState({ nom: "", prenom: "", genre: "Femme", telephone: "", email: "", adresse: "", ...client });
  return (
    <Modal title={client.id ? "Modifier le client" : "Nouveau client"} onClose={onCancel}>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nom"><Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
        <Field label="Prénoms"><Input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} /></Field>
      </div>
      <Field label="Genre" hint="Détermine la fiche de mesures utilisée lors de la prise de commande.">
        <div className="flex gap-2">
          {["Femme", "Homme"].map((g) => (
            <button key={g} type="button" onClick={() => setF({ ...f, genre: g })}
              className="flex-1 rounded-md text-sm font-medium" style={{ padding: "8px 10px", border: "1px solid var(--ligne)", background: f.genre === g ? "var(--noir)" : "#fff", color: f.genre === g ? "var(--creme)" : "var(--noir)" }}>
              {g}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Téléphone"><Input value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Adresse complète"><TextArea rows={2} value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!f.nom || !f.prenom} onClick={() => onSave(f)}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

/* --------------------------------- Stock ---------------------------------- */

function Stock({ stock, ops }) {
  const [editing, setEditing] = useState(null);

  function save(t) {
    if (t.id) ops.update(t.id, t);
    else ops.add({ ...t, id: uid() });
    setEditing(null);
    toastFdj("Tissu enregistré ✓");
  }
  function remove(id) {
    if (confirm("Supprimer ce tissu du stock ?")) ops.remove(id);
  }

  return (
    <div>
      <Header title="Stock de tissus" sub="La maison fournit toujours le tissu — le stock se déduit automatiquement à chaque commande."
        action={<Btn variant="or" onClick={() => setEditing({})}><Plus size={15} /> Ajouter un tissu</Btn>} />

      <Card className="overflow-x-auto">
        {stock.length === 0 ? (
          <EmptyState icon={Package} title="Aucun tissu enregistré" sub="Ajoutez vos rouleaux de tissus pour suivre le métrage disponible." />
        ) : (
          <table>
            <thead><tr><th>Tissu</th><th>Couleur</th><th>Métrage restant</th><th>Prix d'achat / m</th><th>Seuil d'alerte</th><th></th></tr></thead>
            <tbody>
              {stock.map((t) => {
                const critique = Number(t.metrage) < Number(t.seuil || SEUIL_DEFAUT);
                return (
                  <tr key={t.id}>
                    <td className="font-medium">{t.nom}</td>
                    <td>{t.couleur}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {t.metrage} m {critique && <Badge tone="rouge">Stock critique</Badge>}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(t.prixAchat)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{t.seuil || SEUIL_DEFAUT} m</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(t)}><Pencil size={13} style={{ color: "var(--gris-fonce)" }} /></button>
                        <button onClick={() => remove(t.id)}><Trash2 size={13} style={{ color: "var(--bordeaux)" }} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {editing !== null && <TissuForm tissu={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function TissuForm({ tissu, onCancel, onSave }) {
  const [f, setF] = useState({ nom: "", couleur: "", metrage: "", prixAchat: "", seuil: SEUIL_DEFAUT, ...tissu });
  return (
    <Modal title={tissu.id ? "Modifier le tissu" : "Ajouter un tissu"} onClose={onCancel}>
      <Field label="Nom du tissu"><Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Ex : Bazin riche" /></Field>
      <Field label="Couleur"><Input value={f.couleur} onChange={(e) => setF({ ...f, couleur: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Métrage disponible (m)"><Input type="number" value={f.metrage} onChange={(e) => setF({ ...f, metrage: e.target.value })} /></Field>
        <Field label="Prix d'achat au mètre (interne)"><Input type="number" value={f.prixAchat} onChange={(e) => setF({ ...f, prixAchat: e.target.value })} /></Field>
      </div>
      <Field label="Seuil d'alerte (m)" hint="Une alerte visuelle apparaît sous ce seuil."><Input type="number" value={f.seuil} onChange={(e) => setF({ ...f, seuil: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!f.nom} onClick={() => onSave({ ...f, metrage: Number(f.metrage), prixAchat: Number(f.prixAchat), seuil: Number(f.seuil) })}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

/* ------------------------------- Commandes -------------------------------- */

const MESURES = {
  Homme: {
    core: [
      { key: "tourTete", label: "Tour de tête (cm)" },
      { key: "hauteurTotale", label: "Hauteur totale (cm)" },
      { key: "tourCou", label: "Tour de cou (cm)" },
      { key: "tourPoitrine", label: "Tour de poitrine (cm)" },
    ],
    extra: [
      { key: "carrureDos", label: "Carrure dos (cm)" },
      { key: "carrureDevant", label: "Carrure devant (cm)" },
      { key: "longueurEpaule", label: "Longueur d'épaule (cm)" },
      { key: "angleEpaule", label: "Angle d'épaule (cm)" },
      { key: "emmanchureLarge", label: "Emmanchure large (cm)" },
      { key: "emmanchureSerree", label: "Emmanchure serrée (cm)" },
      { key: "tourBiceps", label: "Tour de biceps (cm)" },
      { key: "longueurManche", label: "Longueur de manche (cm)" },
      { key: "tourPoignet", label: "Tour de poignet (cm)" },
      { key: "tourTaille", label: "Tour de taille (cm)" },
      { key: "tourCeinture", label: "Tour de ceinture (cm)" },
      { key: "tourBassin", label: "Tour de bassin (cm)" },
      { key: "longueurVeste", label: "Longueur veste (cm)" },
      { key: "longueurGilet", label: "Longueur gilet (cm)" },
      { key: "longueurChemise", label: "Longueur chemise (cm)" },
      { key: "montantChemise", label: "Montant chemise (cm)" },
      { key: "longueurDos", label: "Longueur du dos, nuque à taille (cm)" },
      { key: "fourche", label: "Fourche (cm)" },
      { key: "montantAssis", label: "Montant assis (cm)" },
      { key: "entrejambe", label: "Entrejambe (cm)" },
      { key: "tourCuisse", label: "Tour de cuisse (cm)" },
      { key: "tourGenou", label: "Tour de genou (cm)" },
      { key: "tailleGenou", label: "Taille genou (cm)" },
      { key: "tourMollet", label: "Tour de mollet (cm)" },
      { key: "longueurPantalon", label: "Longueur pantalon (cm)" },
      { key: "tourBasPantalon", label: "Tour de bas de pantalon (cm)" },
      { key: "longueurBubu", label: "Longueur bubu (cm)" },
    ],
  },
  Femme: {
    core: [
      { key: "tourTete", label: "Tour de tête (cm)" },
      { key: "carrureDevant", label: "Carrure devant (cm)" },
      { key: "carrureDos", label: "Carrure dos (cm)" },
      { key: "tourPoitrine", label: "Tour de poitrine (cm)" },
    ],
    extra: [
      { key: "longueurEpaule", label: "Longueur d'épaule (cm)" },
      { key: "emmanchureLarge", label: "Emmanchure large (cm)" },
      { key: "emmanchureSerree", label: "Emmanchure serrée (cm)" },
      { key: "hauteurDessusPoitrine", label: "Hauteur dessus poitrine (cm)" },
      { key: "hauteurPoitrine", label: "Hauteur de poitrine (cm)" },
      { key: "ecartPoitrine", label: "Écart poitrine (cm)" },
      { key: "tourSousPoitrine", label: "Tour sous poitrine (cm)" },
      { key: "tourBras", label: "Tour de bras (cm)" },
      { key: "longueurManche", label: "Longueur de manche (cm)" },
      { key: "tourPoignet", label: "Tour de poignet (cm)" },
      { key: "tourTaille", label: "Tour de taille (cm)" },
      { key: "tourCeinture", label: "Tour de ceinture (cm)" },
      { key: "tourBassin", label: "Tour de bassin (cm)" },
      { key: "hauteurTailleBassin", label: "Hauteur taille-bassin (cm)" },
      { key: "longueurTailleDevant", label: "Longueur taille devant (cm)" },
      { key: "longueurTailleDos", label: "Longueur taille dos, nuque à taille (cm)" },
      { key: "longueurVeste", label: "Longueur veste (cm)" },
      { key: "longueurChemise", label: "Longueur chemise (cm)" },
      { key: "montantChemise", label: "Montant chemise (cm)" },
      { key: "montantPantalon", label: "Montant pantalon (cm)" },
      { key: "fourche", label: "Fourche (cm)" },
      { key: "tourCuisse", label: "Tour de cuisse (cm)" },
      { key: "tourGenou", label: "Tour de genoux (cm)" },
      { key: "hauteurTailleGenou", label: "Hauteur taille-genou (cm)" },
      { key: "longueurJupe", label: "Longueur jupe (cm)" },
      { key: "longueurPantalon", label: "Longueur pantalon (cm)" },
      { key: "longueurRobe", label: "Longueur robe (cm)" },
      { key: "longueurBubu", label: "Longueur bubu (cm)" },
    ],
  },
};

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function imprimerFiche(titre, contenuHtml) {
  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les fenêtres pop-up de ce site pour pouvoir imprimer."); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(titre)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body{font-family: Georgia, serif; color:#171410; margin:0; font-size:11px;}
      .doc-header{margin:0 0 8px;}
      .doc-logo{height:88px; width:auto; display:block; margin-bottom:5px;}
      h1{font-size:19px; margin:0 0 1px;}
      .sub{font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#8a6d2f; margin:0 0 10px;}
      .section-title{font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color:#8a6d2f; margin:12px 0 4px; border-bottom:1px solid #C9A24B; padding-bottom:2px;}
      .info { margin-top:4px; }
      .row { display:flex; justify-content:space-between; align-items:flex-end; padding:2.5px 0; border-bottom:1px dotted #aaa; }
      .row .lbl { color:#333; padding-right:8px; }
      .row .val { min-width:70px; text-align:right; font-weight:600; white-space:nowrap; }
      .measures { column-count:2; column-gap:22px; margin-top:2px; }
      .measures .row { break-inside: avoid; font-size:10.5px; }
      .measures .val { min-width:40px; }
      .notes{border:1px solid #ccc; height:64px; margin-top:4px;}
      @media print { body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>${contenuHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
  </body></html>`);
  w.document.close();
}

function enteteDocument(sousTitre) {
  return `
    <div class="doc-header">
      <img src="${LOGO_ENSEIGNE_DATA_URI}" alt="Fukelum Djifame" class="doc-logo" />
      <p class="sub">${escHtml(sousTitre)}</p>
    </div>
  `;
}

function ficheVierge(genre) {
  const liste = MESURES[genre] || MESURES.Femme;
  const champs = [...liste.core, ...liste.extra];
  const lignes = champs.map((m) => `<div class="row"><span class="lbl">${escHtml(m.label)}</span><span class="val">&nbsp;</span></div>`).join("");
  return `
    ${enteteDocument("Fiche de mesures vierge — " + genre)}
    <div class="info">
      <div class="row"><span class="lbl">Nom &amp; prénom</span><span class="val">&nbsp;</span></div>
      <div class="row"><span class="lbl">Téléphone</span><span class="val">&nbsp;</span></div>
      <div class="row"><span class="lbl">Adresse</span><span class="val">&nbsp;</span></div>
      <div class="row"><span class="lbl">Modèle souhaité</span><span class="val">&nbsp;</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">&nbsp;</span></div>
    </div>
    <p class="section-title">Mesures (${escHtml(genre)}) — de la tête aux pieds</p>
    <div class="measures">${lignes}</div>
    <p class="section-title">Notes</p>
    <div class="notes"></div>
  `;
}

function ficheRemplie(commande, client, modele) {
  const liste = MESURES[commande.genre] || MESURES.Femme;
  const champs = [...liste.core, ...liste.extra].filter((m) => commande.mesures && commande.mesures[m.key]);
  const lignes = champs.map((m) => `<div class="row"><span class="lbl">${escHtml(m.label)}</span><span class="val">${escHtml(commande.mesures[m.key])} cm</span></div>`).join("");
  return `
    ${enteteDocument("Fiche client — " + (commande.genre || ""))}
    <div class="info">
      <div class="row"><span class="lbl">Client</span><span class="val">${escHtml(client ? client.prenom + " " + client.nom : "—")}</span></div>
      <div class="row"><span class="lbl">Téléphone</span><span class="val">${escHtml(client?.telephone || "—")}</span></div>
      <div class="row"><span class="lbl">Adresse</span><span class="val">${escHtml(client?.adresse || "—")}</span></div>
      <div class="row"><span class="lbl">Modèle</span><span class="val">${escHtml(modele?.nom || "—")}</span></div>
      <div class="row"><span class="lbl">Date de livraison</span><span class="val">${escHtml(fmtDate(commande.dateLivraison))}</span></div>
    </div>
    <p class="section-title">Mesures — de la tête aux pieds</p>
    <div class="measures">${lignes || '<div class="row"><span class="lbl">Aucune mesure enregistrée</span><span class="val"></span></div>'}</div>
  `;
}

const FILTRES_COMMANDES = ["Toutes", "En retard", ...STATUTS, "Impayées"];

function CommandeCard({ commande: c, client, modele, onOpen }) {
  const retard = estEnRetard(c);
  return (
    <Card className="overflow-hidden cursor-pointer" hover onClick={() => onOpen(c)}>
      <div className="flex gap-3 p-3">
        <div className="shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ width: "56px", height: "56px", background: "var(--gris-clair)" }}>
          {modele?.photoUrl ? (
            <img src={modele.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <ImageOff size={16} style={{ color: "var(--gris-fonce)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--gris-fonce)" }}>{fmtNumero(c.numero)}</p>
            <StatutBadge statut={c.statut} />
          </div>
          <p className="font-medium truncate" style={{ fontSize: "14px" }}>{client ? `${client.prenom} ${client.nom}` : "Client supprimé"}</p>
          <p className="text-xs truncate" style={{ color: "var(--gris-fonce)" }}>{modele?.nom || "Modèle supprimé"}</p>
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center justify-between text-xs" style={{ color: "var(--gris-fonce)" }}>
        <span className="flex items-center gap-1">
          {retard ? (
            <Badge tone="rouge">Retard {joursDeRetard(c)} j</Badge>
          ) : (
            <><Calendar size={12} /> {fmtDate(c.dateLivraison)}</>
          )}
        </span>
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {c.resteAPayer > 0 ? <span style={{ color: "var(--bordeaux)", fontWeight: 600 }}>Reste {fmtMoney(c.resteAPayer)}</span> : <span style={{ color: "var(--sauge-txt)" }}>Payé ✓</span>}
        </span>
      </div>
    </Card>
  );
}

function Commandes({ session, commandes, commandesOps, clients, clientsOps, catalogue, stock, encaissements }) {
  const [showForm, setShowForm] = useState(false);
  const [filtre, setFiltre] = useState("Toutes");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const isAdmin = session.role === ROLES.ADMIN;

  async function creerCommande(payload) {
    await creerCommandeAtomique(payload);
    setShowForm(false);
    toastFdj("Commande créée ✓");
  }

  const filtered = commandes
    .filter((c) => {
      if (filtre === "En retard") return estEnRetard(c);
      if (filtre === "Impayées") return Number(c.resteAPayer) > 0;
      if (filtre !== "Toutes") return c.statut === filtre;
      return true;
    })
    .filter((c) => {
      if (!q.trim()) return true;
      const client = clients.find((x) => x.id === c.clientId);
      const modele = catalogue.find((x) => x.id === c.modeleId);
      const hay = `${fmtNumero(c.numero)} ${client ? client.prenom + " " + client.nom : ""} ${modele?.nom || ""}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    })
    .slice()
    .sort((a, b) => (b.numero || 0) - (a.numero || 0));

  return (
    <div>
      <Header title="Commandes" sub="Client, modèle, tissu, mesures et finances — dans cet ordre."
        action={<Btn variant="or" onClick={() => setShowForm(true)}><Plus size={15} /> Nouvelle commande</Btn>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Btn variant="ghost" onClick={() => imprimerFiche("Fiche de mesures vierge — Femme", ficheVierge("Femme"))}>
          <ClipboardList size={14} /> Fiche vierge Femme
        </Btn>
        <Btn variant="ghost" onClick={() => imprimerFiche("Fiche de mesures vierge — Homme", ficheVierge("Homme"))}>
          <ClipboardList size={14} /> Fiche vierge Homme
        </Btn>
      </div>

      <div className="mb-3 flex items-center gap-2 max-w-sm">
        <Search size={15} style={{ color: "var(--gris-fonce)" }} />
        <Input placeholder="Rechercher : client, n° commande, modèle…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTRES_COMMANDES.map((f) => (
          <button key={f} onClick={() => setFiltre(f)} className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: filtre === f ? "var(--noir)" : "var(--gris-clair)", color: filtre === f ? "var(--creme)" : "var(--noir)" }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucune commande" sub="Aucune commande ne correspond à ce filtre — créez-en une, ou changez de filtre." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
          {filtered.map((c) => (
            <CommandeCard
              key={c.id} commande={c}
              client={clients.find((x) => x.id === c.clientId)}
              modele={catalogue.find((x) => x.id === c.modeleId)}
              onOpen={setDetail}
            />
          ))}
        </div>
      )}

      {showForm && (
        <NouvelleCommandeForm
          onCancel={() => setShowForm(false)} onSave={creerCommande}
          clients={clients} clientsOps={clientsOps} catalogue={catalogue} stock={stock} isAdmin={isAdmin}
        />
      )}
      {detail && (
        <FicheCommande
          commande={commandes.find((x) => x.id === detail.id) || detail}
          client={clients.find((x) => x.id === detail.clientId)}
          modele={catalogue.find((x) => x.id === detail.modeleId)}
          tissu={stock.find((x) => x.id === detail.tissuId)}
          paiements={encaissements.filter((e) => e.commandeId === detail.id)}
          commandesOps={commandesOps} isAdmin={isAdmin}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function EncaisserForm({ commande, onCancel, onConfirm }) {
  const [montant, setMontant] = useState("");
  return (
    <Modal title="Encaisser un paiement" onClose={onCancel}>
      <p className="text-sm mb-3" style={{ color: "var(--gris-fonce)" }}>Reste à payer : <strong style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(commande.resteAPayer)}</strong></p>
      <Field label="Montant reçu"><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!montant || Number(montant) <= 0} onClick={() => onConfirm(montant)}>Confirmer l'encaissement</Btn>
      </div>
    </Modal>
  );
}

/* ---------------------------- Fiche commande ----------------------------
   Le dossier complet d'une commande : client, modèle/tissu, mesures,
   workflow de production, finances (historique des paiements) et notes.
   ------------------------------------------------------------------------ */

function FicheCommande({ commande: c, client, modele, tissu, paiements, commandesOps, isAdmin, onClose }) {
  const [pay, setPay] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [notes, setNotes] = useState(c.notes || "");

  const listeGenre = MESURES[c.genre] || MESURES.Femme;
  const mesuresRenseignees = [...listeGenre.core, ...listeGenre.extra].filter((m) => c.mesures?.[m.key]);
  const retard = estEnRetard(c);
  const idxStatut = STATUTS.indexOf(c.statut);
  const dernier = c.statut === STATUT_FINAL;

  async function avancer() {
    setEnCours(true);
    try { await avancerStatutCommande(commandesOps, c); toastFdj("Étape suivante ✓"); }
    finally { setEnCours(false); }
  }

  async function encaisser(montant) {
    await encaisserPaiementAtomique(c.id, montant, "Paiement");
    setPay(false);
    toastFdj("Paiement encaissé ✓");
  }

  function enregistrerNotes() {
    if (notes !== (c.notes || "")) commandesOps.update(c.id, { notes });
  }

  return (
    <Modal title={`${fmtNumero(c.numero)} — ${client ? client.prenom + " " + client.nom : "Client supprimé"}`} onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <StatutBadge statut={c.statut} />
        {retard && <Badge tone="rouge">En retard de {joursDeRetard(c)} j</Badge>}
        <span className="text-xs" style={{ color: "var(--gris-fonce)" }}>Créée le {fmtDate(c.dateCreation)}</span>
      </div>

      <div className="flex gap-3 mb-4">
        {modele?.photoUrl ? (
          <img src={modele.photoUrl} alt="" className="rounded-md" style={{ width: "72px", height: "72px", objectFit: "cover" }} />
        ) : (
          <div className="rounded-md flex items-center justify-center" style={{ width: "72px", height: "72px", background: "var(--gris-clair)" }}>
            <ImageOff size={20} style={{ color: "var(--gris-fonce)" }} />
          </div>
        )}
        <div>
          <p className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "17px" }}>{modele?.nom || "Modèle supprimé"}</p>
          <p className="text-sm" style={{ color: "var(--gris-fonce)" }}>{c.genre} · Livraison souhaitée {fmtDate(c.dateLivraison)}</p>
          {client?.telephone && <p className="text-sm flex items-center gap-1 mt-1"><Phone size={12} style={{ color: "var(--or)" }} /> {client.telephone}</p>}
        </div>
      </div>

      <Ruban />

      {/* Workflow de production */}
      <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Production</p>
      <div className="flex items-center gap-1 mb-3 overflow-x-auto" style={{ paddingBottom: "2px" }}>
        {STATUTS.map((s, i) => (
          <React.Fragment key={s}>
            <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap" style={{
              background: i <= idxStatut ? "var(--or)" : "var(--gris-clair)",
              color: i <= idxStatut ? "#fff" : "var(--gris-fonce)",
              fontWeight: i === idxStatut ? 700 : 500,
            }}>
              {s}
            </span>
            {i < STATUTS.length - 1 && <div style={{ width: "10px", height: "1px", background: "var(--ligne)", flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
      {!dernier && (
        <Btn variant="or" style={{ padding: "6px 14px" }} disabled={enCours} onClick={avancer}>
          {enCours ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Faire passer à « {prochainStatut(c.statut)} »
        </Btn>
      )}

      <Ruban />

      {/* Mesures */}
      <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Mesures</p>
      {mesuresRenseignees.length === 0 ? (
        <p className="text-sm mb-1" style={{ color: "var(--gris-fonce)" }}>Aucune mesure enregistrée.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-sm mb-1" style={{ fontFamily: "var(--font-mono)" }}>
          {mesuresRenseignees.map((m) => (
            <span key={m.key}>{m.label.replace(" (cm)", "")} : <strong>{c.mesures[m.key]}</strong> cm</span>
          ))}
        </div>
      )}

      <Ruban />

      {/* Tissu */}
      <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Tissu</p>
      <p className="text-sm mb-1">
        {tissu ? `${tissu.nom} — ${tissu.couleur}` : "Tissu supprimé"} · <strong style={{ fontFamily: "var(--font-mono)" }}>{c.quantiteTissu} m</strong> utilisés
      </p>

      <Ruban />

      {/* Finances */}
      <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Finances</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        {isAdmin && (
          <Card className="p-3"><p className="text-xs" style={{ color: "var(--gris-fonce)" }}>Prix total</p><p style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmtMoney(c.prixTotal)}</p></Card>
        )}
        <Card className="p-3"><p className="text-xs" style={{ color: "var(--gris-fonce)" }}>Payé</p><p style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--sauge-txt)" }}>{fmtMoney(c.avance)}</p></Card>
        <Card className="p-3" style={{ background: c.resteAPayer > 0 ? "#f2dede" : undefined }}>
          <p className="text-xs" style={{ color: "var(--gris-fonce)" }}>Reste à payer</p>
          <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: c.resteAPayer > 0 ? "var(--bordeaux)" : "var(--noir)" }}>{fmtMoney(c.resteAPayer)}</p>
        </Card>
      </div>

      {paiements.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {paiements.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-md" style={{ background: "var(--gris-clair)" }}>
              <span>{fmtDate(p.date)} — {p.type}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtMoney(p.montant)}</span>
            </div>
          ))}
        </div>
      )}

      {c.resteAPayer > 0 && (
        <Btn variant="or" style={{ padding: "6px 14px" }} onClick={() => setPay(true)}><Banknote size={14} /> Encaisser un paiement</Btn>
      )}

      <Ruban />

      {/* Notes */}
      <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Notes</p>
      <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={enregistrerNotes} placeholder="Remarques particulières sur cette commande…" />

      <div className="flex justify-between gap-2 mt-5">
        <Btn variant="ghost" onClick={() => imprimerFiche(`Fiche client — ${client ? client.prenom + " " + client.nom : ""}`, ficheRemplie(c, client, modele))}>
          <ClipboardList size={14} /> Imprimer la fiche
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
      </div>

      {pay && <EncaisserForm commande={c} onCancel={() => setPay(false)} onConfirm={encaisser} />}
    </Modal>
  );
}

const ETAPES_COMMANDE = [
  { n: 1, label: "Client" },
  { n: 2, label: "Modèle & tissu" },
  { n: 3, label: "Mesures" },
  { n: 4, label: "Livraison & prix" },
];

function EtapesIndicateur({ etape }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {ETAPES_COMMANDE.map((e, i) => (
        <React.Fragment key={e.n}>
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center justify-center rounded-full text-xs font-semibold"
              style={{
                width: "22px", height: "22px",
                background: e.n <= etape ? "var(--or)" : "var(--gris-clair)",
                color: e.n <= etape ? "#fff" : "var(--gris-fonce)",
              }}
            >
              {e.n < etape ? <Check size={12} /> : e.n}
            </span>
            <span className="text-xs font-medium hidden sm:inline" style={{ color: e.n === etape ? "var(--noir)" : "var(--gris-fonce)" }}>{e.label}</span>
          </div>
          {i < ETAPES_COMMANDE.length - 1 && <div style={{ flex: 1, height: "1px", background: "var(--ligne)" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function NouvelleCommandeForm({ onCancel, onSave, clients, clientsOps, catalogue, stock, isAdmin }) {
  const [etape, setEtape] = useState(1);
  const [clientId, setClientId] = useState("");
  const [clientQ, setClientQ] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [modeleId, setModeleId] = useState("");
  const [tissuId, setTissuId] = useState("");
  const [quantiteTissu, setQuantiteTissu] = useState("");
  const [genre, setGenre] = useState("");
  const [mesures, setMesures] = useState({});
  const [specifiquesOuvert, setSpecifiquesOuvert] = useState(false);
  const [dateLivraison, setDateLivraison] = useState("");
  const [prixTotal, setPrixTotal] = useState("");
  const [avance, setAvance] = useState("");
  const [notes, setNotes] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");

  const modele = catalogue.find((m) => m.id === modeleId);
  const tissu = stock.find((t) => t.id === tissuId);
  const client = clients.find((c) => c.id === clientId);
  useEffect(() => { if (modele) setPrixTotal(modele.prix); }, [modeleId]); // eslint-disable-line
  useEffect(() => { if (client?.genre) setGenre(client.genre); }, [clientId]); // eslint-disable-line

  const clientsFiltres = clients.filter((c) => (c.nom + c.prenom).toLowerCase().includes(clientQ.toLowerCase()));
  const reste = Math.max(0, Number(prixTotal || 0) - Number(avance || 0));
  const depasseStock = tissu && Number(quantiteTissu) > Number(tissu.metrage);
  const fichesMesures = MESURES[genre] || MESURES.Femme;

  const etape1Ok = !!clientId;
  const etape2Ok = !!(modeleId && tissuId && quantiteTissu && !depasseStock);
  const etape3Ok = !!genre;
  const peutValider = etape1Ok && etape2Ok && etape3Ok && dateLivraison && prixTotal;

  function changerGenre(g) {
    setGenre(g);
    setMesures({});
  }

  async function ajouterClientRapide(c) {
    const nouveau = { ...c, id: uid(), dateCreation: todayStr() };
    await clientsOps.add(nouveau);
    setClientId(nouveau.id);
    setGenre(nouveau.genre || "Femme");
    setShowNewClient(false);
  }

  async function valider() {
    setErreur("");
    setEnregistrement(true);
    try {
      await onSave({
        clientId, modeleId, tissuId, quantiteTissu: Number(quantiteTissu), genre, mesures, notes,
        dateLivraison, prixTotal: Number(prixTotal), avance: Number(avance || 0), resteAPayer: reste,
      });
    } catch (e) {
      setErreur(e.message || "Une erreur est survenue — la commande n'a pas été créée.");
      setEnregistrement(false);
    }
  }

  function suivant() { setEtape((e) => Math.min(4, e + 1)); }
  function precedent() { setEtape((e) => Math.max(1, e - 1)); }

  return (
    <Modal title="Nouvelle commande" onClose={onCancel} wide>
      <EtapesIndicateur etape={etape} />

      {etape === 1 && (
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Client</p>
          {!clientId ? (
            <div>
              <Input placeholder="Rechercher un client…" value={clientQ} onChange={(e) => setClientQ(e.target.value)} />
              <div className="max-h-40 overflow-y-auto mt-2 flex flex-col gap-1">
                {clientsFiltres.slice(0, 8).map((c) => (
                  <button key={c.id} onClick={() => setClientId(c.id)} className="text-left text-sm px-3 py-2 rounded-md" style={{ background: "var(--gris-clair)" }}>
                    {c.prenom} {c.nom} {c.telephone && `· ${c.telephone}`}
                  </button>
                ))}
                {clientsFiltres.length === 0 && <p className="text-xs px-1" style={{ color: "var(--gris-fonce)" }}>Aucun client trouvé.</p>}
              </div>
              <button className="text-xs mt-2 font-semibold" style={{ color: "var(--or)" }} onClick={() => setShowNewClient(true)}>+ Nouveau client</button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-md" style={{ background: "var(--gris-clair)" }}>
              <span className="text-sm font-medium">{client?.prenom} {client?.nom}</span>
              <button className="text-xs" style={{ color: "var(--bordeaux)" }} onClick={() => setClientId("")}>Changer</button>
            </div>
          )}
          {showNewClient && <InlineClientForm onCancel={() => setShowNewClient(false)} onSave={ajouterClientRapide} />}
        </div>
      )}

      {etape === 2 && (
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Modèle</p>
          <Select value={modeleId} onChange={(e) => setModeleId(e.target.value)}>
            <option value="">— Sélectionner un modèle —</option>
            {catalogue.map((m) => <option key={m.id} value={m.id}>{m.nom} ({m.categorie || "sans catégorie"})</option>)}
          </Select>
          {modele && (
            <div className="flex items-center gap-3 mt-2">
              {modele.photoUrl ? (
                <img src={modele.photoUrl} alt="" className="rounded-md" style={{ width: "52px", height: "52px", objectFit: "cover" }} />
              ) : (
                <div className="rounded-md flex items-center justify-center" style={{ width: "52px", height: "52px", background: "var(--gris-clair)" }}>
                  <ImageOff size={16} style={{ color: "var(--gris-fonce)" }} />
                </div>
              )}
              <p className="text-sm">Prix de vente : <strong style={{ fontFamily: "var(--font-mono)" }}>{fmtMoney(modele.prix)}</strong></p>
            </div>
          )}

          <Ruban />
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Tissu (déduit du stock)</p>
          <div className="grid sm:grid-cols-2 gap-x-3">
            <Select value={tissuId} onChange={(e) => setTissuId(e.target.value)}>
              <option value="">— Sélectionner un tissu —</option>
              {stock.map((t) => <option key={t.id} value={t.id}>{t.nom} — {t.couleur} ({t.metrage} m dispo.)</option>)}
            </Select>
            <Input type="number" placeholder="Quantité utilisée (m)" value={quantiteTissu} onChange={(e) => setQuantiteTissu(e.target.value)} />
          </div>
          {depasseStock && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--bordeaux)" }}>
              <AlertTriangle size={12} /> Quantité supérieure au stock disponible ({tissu.metrage} m).
            </p>
          )}
        </div>
      )}

      {etape === 3 && (
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Prise de mesures</p>
          <Field label="Genre du client" hint="Détermine la fiche de mesures utilisée (peut différer de la fiche client).">
            <div className="flex gap-2">
              {["Femme", "Homme"].map((g) => (
                <button key={g} type="button" onClick={() => changerGenre(g)}
                  className="flex-1 rounded-md text-sm font-medium" style={{ padding: "8px 10px", border: "1px solid var(--ligne)", background: genre === g ? "var(--noir)" : "#fff", color: genre === g ? "var(--creme)" : "var(--noir)" }}>
                  {g}
                </button>
              ))}
            </div>
          </Field>

          {genre && (
            <>
              <div className="grid sm:grid-cols-2 gap-x-3">
                {fichesMesures.core.map((m) => (
                  <Field key={m.key} label={m.label}>
                    <Input type="number" value={mesures[m.key] || ""} onChange={(e) => setMesures({ ...mesures, [m.key]: e.target.value })} />
                  </Field>
                ))}
              </div>
              <button className="text-xs font-semibold mb-2" style={{ color: "var(--or)" }} onClick={() => setSpecifiquesOuvert(!specifiquesOuvert)}>
                {specifiquesOuvert ? "− Masquer" : "+ Ajouter"} les mesures complémentaires ({genre.toLowerCase()}, selon le modèle)
              </button>
              {specifiquesOuvert && (
                <div className="grid sm:grid-cols-2 gap-x-3 p-3 rounded-md mb-2" style={{ background: "var(--gris-clair)" }}>
                  {fichesMesures.extra.map((m) => (
                    <Field key={m.key} label={m.label}>
                      <Input type="number" value={mesures[m.key] || ""} onChange={(e) => setMesures({ ...mesures, [m.key]: e.target.value })} />
                    </Field>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {etape === 4 && (
        <div>
          <Field label="Date de livraison souhaitée"><Input type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} /></Field>

          <Ruban />
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--or)" }}>Finances</p>
          <div className="grid sm:grid-cols-3 gap-x-3">
            <Field label="Prix total">
              <Input type="number" value={prixTotal} onChange={(e) => setPrixTotal(e.target.value)} disabled={!isAdmin} />
            </Field>
            <Field label="Acompte versé"><Input type="number" value={avance} onChange={(e) => setAvance(e.target.value)} /></Field>
            <Field label="Reste à payer"><Input value={fmtMoney(reste)} disabled style={{ fontWeight: 600 }} /></Field>
          </div>

          <Field label="Notes (facultatif)"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          {erreur && (
            <p className="text-xs mb-2 flex items-center gap-1" style={{ color: "var(--bordeaux)" }}>
              <AlertTriangle size={12} /> {erreur}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between gap-2 mt-5">
        <div>{etape > 1 && <Btn variant="ghost" onClick={precedent}>Précédent</Btn>}</div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
          {etape < 4 ? (
            <Btn variant="or" disabled={(etape === 1 && !etape1Ok) || (etape === 2 && !etape2Ok) || (etape === 3 && !etape3Ok)} onClick={suivant}>
              Suivant
            </Btn>
          ) : (
            <Btn variant="or" disabled={!peutValider || enregistrement} onClick={valider}>
              {enregistrement ? <Loader2 size={14} className="animate-spin" /> : "Créer la commande"}
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  );
}

function InlineClientForm({ onCancel, onSave }) {
  const [f, setF] = useState({ nom: "", prenom: "", genre: "Femme", telephone: "", email: "", adresse: "" });
  return (
    <div className="p-3 rounded-md mt-2" style={{ background: "var(--gris-clair)" }}>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nom"><Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
        <Field label="Prénoms"><Input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} /></Field>
      </div>
      <Field label="Genre" hint="Détermine la fiche de mesures qui s'affichera ensuite.">
        <div className="flex gap-2">
          {["Femme", "Homme"].map((g) => (
            <button key={g} type="button" onClick={() => setF({ ...f, genre: g })}
              className="flex-1 rounded-md text-sm font-medium" style={{ padding: "8px 10px", border: "1px solid var(--ligne)", background: f.genre === g ? "var(--noir)" : "#fff", color: f.genre === g ? "var(--creme)" : "var(--noir)" }}>
              {g}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Téléphone"><Input value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></Field>
      <Field label="Adresse complète"><TextArea rows={2} value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} /></Field>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!f.nom || !f.prenom} onClick={() => onSave(f)}>Ajouter</Btn>
      </div>
    </div>
  );
}

/* --------------------------------- Atelier -------------------------------- */

function Atelier({ commandes, commandesOps, catalogue, clients }) {
  const [filtre, setFiltre] = useState("Actives");

  const liste = commandes
    .filter((c) => (filtre === "Actives" ? c.statut !== STATUT_FINAL : true))
    .slice()
    .sort((a, b) => (estEnRetard(b) ? 1 : 0) - (estEnRetard(a) ? 1 : 0) || (a.dateLivraison || "").localeCompare(b.dateLivraison || ""));

  async function avancerStatut(c) {
    const suivant = await avancerStatutCommande(commandesOps, c);
    toastFdj(suivant === STATUT_FINAL ? "Commande livrée ✓" : "Commande passée à « " + suivant + " » ✓");
  }

  return (
    <div>
      <Header title="Atelier" sub="Vos tâches en cours : photo du modèle, mesures et statut." />
      <div className="flex gap-1 mb-4">
        {["Actives", "Toutes"].map((f) => (
          <button key={f} onClick={() => setFiltre(f)} className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: filtre === f ? "var(--noir)" : "var(--gris-clair)", color: filtre === f ? "var(--creme)" : "var(--noir)" }}>
            {f}
          </button>
        ))}
      </div>

      {liste.length === 0 ? (
        <EmptyState icon={Scissors} title="Rien à produire pour le moment" sub="Les commandes validées apparaîtront ici avec les mesures et la photo du modèle." />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
          {liste.map((c) => {
            const modele = catalogue.find((m) => m.id === c.modeleId);
            const client = clients.find((x) => x.id === c.clientId);
            const listeGenre = MESURES[c.genre] || MESURES.Femme;
            const toutesMesures = [...listeGenre.core, ...listeGenre.extra].filter((m) => c.mesures?.[m.key]);
            const retard = estEnRetard(c);
            return (
              <Card key={c.id} className="overflow-hidden" style={retard ? { borderColor: "var(--bordeaux)" } : undefined}>
                <div className="h-32 flex items-center justify-center relative" style={{ background: "var(--gris-clair)" }}>
                  {modele?.photoUrl ? (
                    <img src={modele.photoUrl} alt={modele.nom} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <ImageOff size={20} style={{ color: "var(--gris-fonce)" }} />
                  )}
                  {retard && (
                    <span className="absolute" style={{ top: "8px", left: "8px" }}>
                      <Badge tone="rouge">Retard {joursDeRetard(c)} j</Badge>
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--gris-fonce)" }}>{fmtNumero(c.numero)}</p>
                    <StatutBadge statut={c.statut} />
                  </div>
                  <p className="font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "15px" }}>{modele?.nom || "Modèle"}</p>
                  <p className="text-xs mb-2" style={{ color: "var(--gris-fonce)" }}>{client ? `${client.prenom} ${client.nom}` : "Client"} · {c.genre || "—"} · Livraison {fmtDate(c.dateLivraison)}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-3" style={{ fontFamily: "var(--font-mono)" }}>
                    {toutesMesures.map((m) => (
                      <span key={m.key}>{m.label.replace(" (cm)", "")}: <strong>{c.mesures[m.key]}</strong> cm</span>
                    ))}
                  </div>
                  {c.statut !== STATUT_FINAL && (
                    <Btn variant="or" className="w-full" style={{ padding: "6px 16px" }} onClick={() => avancerStatut(c)}>
                      <Check size={14} /> Passer à « {prochainStatut(c.statut)} »
                    </Btn>
                  )}
                  <Btn variant="ghost" className="w-full mt-2" style={{ padding: "6px 16px" }}
                    onClick={() => imprimerFiche(`Fiche client — ${client ? client.prenom + " " + client.nom : ""}`, ficheRemplie(c, client, modele))}>
                    <ClipboardList size={14} /> Imprimer la fiche
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Paramètres -------------------------------- */

function Parametres({ employes, ops, onReset }) {
  const [editing, setEditing] = useState(null);

  function save(e) {
    if (e.id) ops.update(e.id, e);
    else ops.add({ ...e, id: uid() });
    setEditing(null);
    toastFdj("Employé enregistré ✓");
  }
  function remove(id) {
    if (confirm("Retirer cet employé ?")) ops.remove(id);
  }

  return (
    <div>
      <Header title="Paramètres" sub="Gestion des employés, des rôles d'accès et des données de démonstration."
        action={<Btn variant="or" onClick={() => setEditing({})}><Plus size={15} /> Ajouter un employé</Btn>} />

      <Card className="overflow-x-auto mb-6">
        <table>
          <thead><tr><th>Nom</th><th>Email de connexion</th><th>Rôle</th><th></th></tr></thead>
          <tbody>
            {employes.map((e) => (
              <tr key={e.id}>
                <td className="font-medium">{e.nom}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{e.email || "—"}</td>
                <td><Badge tone="or">{e.role}</Badge></td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(e)}><Pencil size={13} style={{ color: "var(--gris-fonce)" }} /></button>
                    <button onClick={() => remove(e.id)}><Trash2 size={13} style={{ color: "var(--bordeaux)" }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-1">Réinitialiser les données</p>
        <p className="text-xs mb-3" style={{ color: "var(--gris-fonce)" }}>Efface commandes et encaissements, restaure le catalogue, le stock et les clients d'exemple.</p>
        <Btn variant="danger" onClick={onReset}><RotateCcw size={14} /> Réinitialiser</Btn>
      </Card>

      {editing !== null && <EmployeForm employe={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EmployeForm({ employe, onCancel, onSave }) {
  const [f, setF] = useState({ nom: "", email: "", role: ROLES.VENDEUSE, ...employe });
  return (
    <Modal title={employe.id ? "Modifier l'employé" : "Ajouter un employé"} onClose={onCancel}>
      <Field label="Nom"><Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
      <Field label="Email de connexion" hint="La personne se connectera avec cette adresse. Elle choisira son propre mot de passe lors de sa première connexion.">
        <Input type="email" placeholder="prenom@gmail.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.trim().toLowerCase() })} />
      </Field>
      <Field label="Rôle">
        <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn variant="or" disabled={!f.nom || !f.email} onClick={() => onSave(f)}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}
