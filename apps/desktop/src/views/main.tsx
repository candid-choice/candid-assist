import "./index.css";
import { App } from "./App";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { setRPC } from "./services/window-controls";
import { defineRendererRPC } from "../rpc/renderer";
import { Electroview } from "../../.hutch/devkit/api/browser/index";

import { wsService } from "./services/ws-service";
import { useStore } from "./store";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("React root element not found");
}

if (window.__electrobun) {
  // Set up RPC — renderer ↔ Bun bridge
  const rpc = defineRendererRPC();
  new Electroview({ rpc });
  setRPC(rpc);

  // Connect WebSocket for surface events
  wsService.connect();

  // Mirror WS connection state into the store (UI: status bar / banner)
  wsService.onConnectionChange((state) => {
    useStore.getState().setConnectionState(state);
  });

  // Subscribe surface push events to store
  wsService.subscribe((event) => {
    if (event.event === "surface:push") {
      const { surfaceId, type, payload } = event.data;
      useStore.getState().openSurface({
        id: surfaceId,
        label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " "),
        type: type as any,
        title: type.charAt(0).toUpperCase() + type.slice(1) + " Surface",
        payload,
        source: "mcp",
        createdAt: Date.now(),
      });
    }
  });
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
