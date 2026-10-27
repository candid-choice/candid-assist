"use client";

import dynamic from "next/dynamic";

// The desktop UI is a pure client app (IndexedDB persistence, WebSocket,
// Firebase) — no SSR.
const RootUI = dynamic(() => import("@/RootUI"), { ssr: false });

export default function Page() {
  return <RootUI />;
}
