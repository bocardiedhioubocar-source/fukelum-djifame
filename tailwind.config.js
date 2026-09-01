/** Utilitaires Tailwind minimaux, générés uniquement pour les classes réellement
 *  utilisées dans le JSX de l'application (pas de CDN Tailwind embarqué en prod). */
module.exports = {
  content: ["./fukelum-djifame-app.jsx", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false, // le reset (html, body, #root) est géré dans build/template-head.html
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
