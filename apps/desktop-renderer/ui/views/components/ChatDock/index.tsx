/**
 * ChatDock — togglable right column for DIRECT chat with the in-process
 * pi agent (Electron only; MCP remains the external path). Transcripts
 * are kept per harness session in the persisted store.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import "./index.css";
import { useStore, type ChatMessage } from "../../store";
import { getDesktopBridge } from "../../services/desktop-bridge";

const NO_MESSAGES: ChatMessage[] = [];

function newId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ChatDockProps {
  /** Harness session id the chat belongs to (null = none selected). */
  sessionId: string | null;
  /** Collapse the dock (✕ in the header). */
  onClose?: () => void;
}

export function ChatDock({ sessionId, onClose }: ChatDockProps) {
  const bridge = getDesktopBridge();
  const chat = bridge?.chat;
  const messages = useStore((s) =>
    (sessionId ? s.chatBySession[sessionId] : undefined) ?? NO_MESSAGES
  );
  const busy = useStore((s) => (sessionId ? s.chatBusy[sessionId] === true : false));
  const appendChatMessage = useStore((s) => s.appendChatMessage);
  const setChatBusy = useStore((s) => s.setChatBusy);
  const clearChat = useStore((s) => s.clearChat);
  const workspacePath = useStore((s) => s.settings.workspacePath);
  const chatWidth = useStore((s) => s.chatWidth);
  const setChatWidth = useStore((s) => s.setChatWidth);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<Map<string, string>>(new Map());

  // Stream assistant deltas / tool markers / errors from the main process.
  useEffect(() => {
    if (!chat) return;
    return chat.onEvent((e) => {
      const msg = mapEvent(e, streamingRef.current);
      if (msg) appendChatMessage(e.sessionId, msg);
      if (e.kind === "done" || e.kind === "error") setChatBusy(e.sessionId, false);
    });
  }, [chat, appendChatMessage, setChatBusy]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!chat || !sessionId) return;
    const text = draft.trim();
    if (!text || busy) return;
    appendChatMessage(sessionId, {
      id: newId(),
      role: "user",
      text,
      ts: new Date().toISOString(),
    });
    setChatBusy(sessionId, true);
    setDraft("");
    void chat.send(sessionId, text, workspacePath || undefined);
  };

  const stop = () => {
    if (!chat || !sessionId) return;
    chat.abort(sessionId);
    setChatBusy(sessionId, false);
  };

  // ── Left-edge drag resize (mirrors SidebarResizer's frame lock) ─────
  const [chatDragging, setChatDragging] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const onChatResizeStart = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    resizeRef.current = {
      startX: e.clientX,
      startWidth: useStore.getState().chatWidth,
    };
    setChatDragging(true);
  }, []);
  useEffect(() => {
    if (!chatDragging) return;
    const onMove = (e: MouseEvent) => {
      const d = resizeRef.current;
      if (!d) return;
      setChatWidth(d.startWidth + (d.startX - e.clientX)); // right column: drag left = wider
    };
    const onUp = () => {
      resizeRef.current = null;
      setChatDragging(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.classList.add("ha-resizing-sidebar");
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("ha-resizing-sidebar");
    };
  }, [chatDragging, setChatWidth]);

  return (
    <div
      className="ha-chat-dock"
      role="complementary"
      aria-label="Chat"
      style={{ width: chatWidth }}
    >
      {chatDragging && <div className="ha-chat-resize-overlay" data-testid="chat-resize-overlay" />}
      <div
        className={`ha-chat-resizer${chatDragging ? " ha-chat-resizer--active" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        title="Drag to resize · double-click to reset"
        onMouseDown={onChatResizeStart}
        onDoubleClick={() => setChatWidth(320)}
      />
      <div className="ha-chat-dock-header">
        <span className="ha-chat-dock-title">Chat</span>
        <span className="ha-chat-dock-sub">{sessionId ? "direct · in-app" : "no session"}</span>
        <button
          type="button"
          className="ha-chat-dock-clear"
          title="Clear this chat"
          onClick={() => sessionId && clearChat(sessionId)}
          disabled={!sessionId || messages.length === 0}
        >
          Clear
        </button>
        {onClose && (
          <button
            type="button"
            className="ha-chat-dock-close"
            title="Hide chat"
            aria-label="Hide chat"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      <div className="ha-chat-dock-list" ref={listRef}>
        {messages.length === 0 && (
          <p className="ha-chat-dock-empty">
            {sessionId
              ? "Say something — this talks to the agent directly, no MCP client needed."
              : "Select a session in the sidebar to chat."}
          </p>
        )}
        {messages.map((m) =>
          m.role === "tool" ? (
            <div key={m.id} className="ha-chat-tool">⚙ {m.text}</div>
          ) : (
            <div key={m.id} className={`ha-chat-bubble ha-chat-bubble--${m.role}`}>
              {m.text}
            </div>
          ),
        )}
        {busy && <div className="ha-chat-bubble ha-chat-bubble--assistant ha-chat-typing">…</div>}
      </div>

      <div className="ha-chat-dock-composer">
        <textarea
          className="ha-chat-input"
          placeholder={sessionId ? "Message the agent… (Enter to send)" : "Select a session first"}
          value={draft}
          disabled={!sessionId || !chat}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {busy ? (
          <button type="button" className="ha-chat-send ha-chat-send--stop" onClick={stop}>
            ■
          </button>
        ) : (
          <button
            type="button"
            className="ha-chat-send"
            onClick={send}
            disabled={!sessionId || !chat || !draft.trim()}
          >
            ➤
          </button>
        )}
      </div>
    </div>
  );
}

/** Turn a main-process chat event into a store message (deltas merge). */
function mapEvent(
  e: { sessionId: string; kind: string; text: string },
  streaming: Map<string, string>,
): ChatMessage | null {
  const now = new Date().toISOString();
  if (e.kind === "delta") {
    // Merge consecutive assistant deltas into the streaming bubble:
    // append to last message when it is the open assistant bubble.
    const st = useStore.getState();
    const list = st.chatBySession[e.sessionId] ?? [];
    const openId = streaming.get(e.sessionId);
    const last = openId ? list.find((m) => m.id === openId) : undefined;
    if (last) {
      // rewrite last message text in place
      const updated = list.map((m) => (m.id === last.id ? { ...m, text: m.text + e.text } : m));
      useStore.setState((s) => ({
        chatBySession: { ...s.chatBySession, [e.sessionId]: updated },
      }));
      return null;
    }
    const id = newId();
    streaming.set(e.sessionId, id);
    return { id, role: "assistant", text: e.text, ts: now };
  }
  if (e.kind === "done") {
    streaming.delete(e.sessionId);
    return null;
  }
  if (e.kind === "tool") {
    streaming.delete(e.sessionId); // next delta starts a fresh bubble
    return { id: newId(), role: "tool", text: e.text, ts: now };
  }
  if (e.kind === "error") {
    streaming.delete(e.sessionId);
    return { id: newId(), role: "error", text: e.text, ts: now };
  }
  return null;
}
