/** Add Surface menu — the “+” at the right end of the tab bar.

Human-initiated surface creation. The flagship flow this unlocks:
open a site yourself, log in (persistent profile remembers you), then
tell the connected coding harness “do X on the tab you see” — the
agent drives the very same surface via browserExecuteActions.

Sends { type: "surface:create" } over the renderer→main WS bus; main
creates the surface (consent-free — a human asked for it) and pushes a
normal surface:push, so the tab lands in the active session exactly
like an agent-created one. If no session is selected, one is created
first (surfaces are always session-scoped).
*/

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconCamera,
  IconCube,
  IconLayout,
  IconPhoto,
  IconPlus,
  IconTerminal2,
  IconWorld,
} from "@tabler/icons-react";
import { useStore } from "../../store";
import { addUserSession } from "../../lib/user-session";
import { wsService } from "../../services/ws-service";
import "./index.css";

interface SurfaceItem {
  type: string;
  label: string;
  hint: string;
  icon: ReactNode;
  needsUrl?: boolean;
  urlPlaceholder?: string;
}

const ITEMS: SurfaceItem[] = [
  {
    type: "browser",
    label: "Browser",
    hint: "Open a site — log in once, then let the agent drive it",
    icon: <IconWorld size={15} stroke={1.75} />,
    needsUrl: true,
    urlPlaceholder: "https://…",
  },
  {
    type: "image",
    label: "Image",
    hint: "View an image side-by-side",
    icon: <IconPhoto size={15} stroke={1.75} />,
    needsUrl: true,
    urlPlaceholder: "https://…/image.png",
  },
  {
    type: "canvas",
    label: "Canvas",
    hint: "Scratch visual canvas",
    icon: <IconLayout size={15} stroke={1.75} />,
  },
  {
    type: "threed",
    label: "3D scene",
    hint: "Interactive three.js viewer",
    icon: <IconCube size={15} stroke={1.75} />,
  },
  {
    type: "process",
    label: "Processes",
    hint: "Background processes the agent launched",
    icon: <IconTerminal2 size={15} stroke={1.75} />,
  },
  {
    type: "screen",
    label: "Screen capture",
    hint: "Share your screen as context",
    icon: <IconCamera size={15} stroke={1.75} />,
  },
];

export function AddSurfaceMenu() {
  const [open, setOpen] = useState(false);
  const [urlItem, setUrlItem] = useState<SurfaceItem | null>(null);
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Native-context-menu dismissal: Esc or any pointerdown elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setUrlItem(null);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setUrlItem(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (urlItem) inputRef.current?.focus();
  }, [urlItem]);

  const create = (item: SurfaceItem, createUrl?: string) => {
    const st = useStore.getState();
    // Surfaces are session-scoped — ensure the user has a session to
    // drop this into (create + select one when none is active).
    const sessionId = st.activeSessionId ?? addUserSession();
    const sent = wsService.send({
      type: "surface:create",
      surfaceType: item.type,
      sessionId,
      ...(createUrl ? { url: createUrl } : {}),
    });
    if (!sent) {
      st.pushUiMessage({
        message: "Desktop runtime not connected — open the Human Assist app to add surfaces.",
        type: "warning",
      });
    }
    setOpen(false);
    setUrlItem(null);
    setUrl("");
  };

  return (
    <div className="ha-add-surface" ref={ref}>
      <button
        type="button"
        className="ha-add-surface-btn"
        aria-label="Add surface"
        title="Add surface"
        onClick={() => setOpen((v) => !v)}
      >
        <IconPlus size={15} stroke={2} />
      </button>

      {open && (
        <div className="ha-add-surface-menu" role="menu">
          {!urlItem ? (
            <>
              <div className="ha-add-surface-head">Add a surface</div>
              {ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="ha-add-surface-item"
                  role="menuitem"
                  onClick={() => {
                    if (item.needsUrl) setUrlItem(item);
                    else create(item);
                  }}
                >
                  <span className="ha-add-surface-icon">{item.icon}</span>
                  <span className="ha-add-surface-text">
                    <span className="ha-add-surface-label">{item.label}</span>
                    <span className="ha-add-surface-hint">{item.hint}</span>
                  </span>
                </button>
              ))}
            </>
          ) : (
            <form
              className="ha-add-surface-form"
              onSubmit={(e) => {
                e.preventDefault();
                const v = url.trim();
                const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
                if (v) create(urlItem, withProto);
              }}
            >
              <div className="ha-add-surface-head">
                {urlItem.icon} {urlItem.label}
              </div>
              <input
                ref={inputRef}
                className="ha-add-surface-url"
                type="text"
                placeholder={urlItem.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-label={`${urlItem.label} URL`}
              />
              <div className="ha-add-surface-actions">
                <button
                  type="button"
                  className="ha-add-surface-back"
                  onClick={() => setUrlItem(null)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="ha-add-surface-go"
                  disabled={!url.trim()}
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
