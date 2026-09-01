import { createRoot } from "react-dom/client";
import App from "../fukelum-djifame-app.jsx";

// Le montage est différé jusqu'à ce que le script Firebase (chargé après ce
// bundle dans le document) ait initialisé window.__fdjAuth / window.storage.
window.__startApp = function startApp() {
  const container = document.getElementById("root");
  const root = createRoot(container);
  root.render(<App />);
};
