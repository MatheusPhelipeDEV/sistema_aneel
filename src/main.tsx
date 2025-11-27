import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx"; // <--- Deve chamar o App, não o Dashboard
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
