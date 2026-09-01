# Fukelum Djifame — Application de gestion

Application de gestion pour **Fukelum Djifame**, maison de couture basée à Dakar, Sénégal.

## En ligne

- **Application** : https://fukelum-djifame.web.app
- **Hébergement** : Firebase Hosting (projet `fukelum-djifame` — le même que Firestore/Authentication, plus besoin de Netlify)
- **Base de données** : Firebase (Firestore + Authentication)

## Fonctionnalités

- Connexion sécurisée par email / mot de passe (comptes Administrateur)
- Gestion du catalogue de modèles (avec photos et cadrage)
- Gestion des clients (contact, historique de commandes)
- Prise de commande : client → modèle → tissu → mesures → livraison → finances
- Fiches de mesures Homme / Femme, classées de la tête aux pieds
- Stock de tissus avec alerte de seuil critique
- Atelier : suivi des commandes en cours pour la couturière
- Tableau de bord (chiffre d'affaires du jour, commandes par statut)
- Fiches imprimables (vierges ou remplies), au format A4, une seule page
- Synchronisation en temps réel entre plusieurs appareils (Firebase)

## Fichiers du dépôt

| Fichier | Description |
|---|---|
| `fukelum-djifame-app.jsx` | Code source React (lisible, pour modification) |
| `public/index.html` | Application complète, autonome (HTML + CSS + JS) — **généré**, non versionné (voir ci-dessous), déployé sur Firebase Hosting |
| `firebase.json`, `.firebaserc` | Configuration Firebase Hosting (projet `fukelum-djifame`) |
| `FUKELUM_DJIFAME_Base_de_donnees.xlsx` | Cahier des charges initial / structure de données |
| `fukelum-djifame-logos.zip` | Logo, icône d'application et déclinaisons bijoux (boutons, broche) |

## Identité visuelle

Palette : crème (`#EDE3D0`), terracotta (`#B5651D`), ocre (`#C6841F`), marron (`#2A1F16`).

## Mettre à jour l'application en ligne

`public/index.html` est un fichier **généré** (minifié, non versionné dans git) — ne jamais le modifier à la main, il est recréé à chaque build.

1. Modifier `fukelum-djifame-app.jsx` (le code source, lisible).
2. Installer les dépendances une première fois : `npm install`.
3. La toute première fois seulement : `npx firebase login` (ouvre une fenêtre pour se connecter avec le compte Google du projet), puis `npx firebase use fukelum-djifame`.
4. Déployer : `npm run deploy` (regénère `public/index.html` depuis le `.jsx`, puis lance `firebase deploy --only hosting`).

Le dossier `build/` contient le script de build (`build.mjs`), la tête HTML statique (favicon, manifest…) et la glue Firebase — ces fichiers ne changent normalement pas.

Pour juste régénérer le HTML sans déployer (pour tester en local par exemple) : `npm run build`.

---

*Maison de Couture — Dakar, Sénégal*
