import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DefaultProviders } from "./components/providers/default.tsx";

createRoot(document.getElementById("root")!).render(
  <DefaultProviders>
    <App />
  </DefaultProviders>,
);
