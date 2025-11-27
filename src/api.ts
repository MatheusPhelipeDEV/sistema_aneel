/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

// Força o TypeScript a aceitar que window existe
declare const window: any;

// Lógica Inteligente:
// Se estiver rodando no seu computador (localhost), usa o Python local (porta 5000).
// Se estiver na internet (GitHub Pages), usa o servidor oficial no Render.

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_BASE_URL = isLocalhost
  ? "http://localhost:5000"
  : "https://sistema-aneel.onrender.com";

export const api = axios.create({
  baseURL: API_BASE_URL,
});
