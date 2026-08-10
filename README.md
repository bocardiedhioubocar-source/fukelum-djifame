# Fukelum Djifame — Application de gestion

Application de gestion pour **Fukelum Djifame**, maison de couture basée à Dakar, Sénégal.

## En ligne

- **Application** : https://fukelum-djifame.netlify.app
- **Hébergement** : Netlify
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
| `fukelum-djifame-app.html` | Application complète, autonome (HTML + CSS + JS), déployée sur Netlify |
| `fukelum-djifame-app.jsx` | Code source React (lisible, pour modification) |
| `FUKELUM_DJIFAME_Base_de_donnees.xlsx` | Cahier des charges initial / structure de données |
| `fukelum-djifame-logos.zip` | Logo, icône d'application et déclinaisons bijoux (boutons, broche) |

## Identité visuelle

Palette : crème (`#EDE3D0`), terracotta (`#B5651D`), ocre (`#C6841F`), marron (`#2A1F16`).

## Mettre à jour l'application en ligne

1. Modifier `fukelum-djifame-app.html`.
2. Aller sur [app.netlify.com](https://app.netlify.com), ouvrir le projet `fukelum-djifame`.
3. Déposer le nouveau fichier via « browse files to upload » → confirmer le renommage en `index.html`.

---

*Maison de Couture — Dakar, Sénégal*
