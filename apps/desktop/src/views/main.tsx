import "./index.css";
import { App } from "./App";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { setRPC } from "./services/window-controls";
import { defineRendererRPC } from "../rpc/renderer";
import { Electroview } from "../../.hutch/devkit/api/browser/index";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("React root element not found");
}

if (window.__electrobun) {
  // Set up RPC — renderer ↔ Bun bridge
  // Creating an Electroview instance wires the transport onto the RPC object
  // so that request.send() can communicate with the Bun side.
  const rpc = defineRendererRPC();
  new Electroview({ rpc });
  setRPC(rpc);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
