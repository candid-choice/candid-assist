/** TerminalSurface — scrollable terminal output viewer with search/highlight. */

import { useState, useRef, useEffect } from "react";

import type { SurfaceConfig, TerminalPayload } from "../../types";

import "./index.css";

export interface TerminalSurfaceProps {
  config: SurfaceConfig<TerminalPayload>;
  onComplete: (result: { completed: boolean; data: Record<string, unknown> }) => void;
}

export function TerminalSurface({ config, onComplete }: TerminalSurfaceProps) {
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [output, setOutput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const payload = config.payload as TerminalPayload;

  useEffect(() => {
    setOutput(payload.output || "");
  }, [payload.output]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleSend = () => {
    onComplete({
      completed: true,
      data: {
        terminal_output: output,
        surfaceId: config.id,
      },
    });
  };

  const handleReRun = () => {
    setOutput((prev) => `${prev}\n$ ${payload.command}\n`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  // Filtered lines for search
  const filteredLines = searchText
    ? output
        .split("\n")
        .filter((line) => line.toLowerCase().includes(searchText.toLowerCase()))
        .join("\n")
    : output;

  return (
    <div className="ha-term-surface">
      {/* Toolbar */}
      <div className="ha-term-toolbar">
        <span className="ha-term-cmd">{payload.command}</span>
        <div className="ha-term-actions">
          <button
            className="ha-btn ha-btn--sm ha-btn--icon"
            title="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            🔍
          </button>
          <button
            className="ha-btn ha-btn--sm ha-btn--icon"
            title="Copy"
            onClick={handleCopy}
          >
            📋
          </button>
          <button
            className="ha-btn ha-btn--sm"
            title="Re-run"
            onClick={handleReRun}
          >
            ↻ Re-run
          </button>
          <button className="ha-btn ha-btn--sm ha-btn--primary" onClick={handleSend}>
            Send to Claude
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="ha-term-search">
          <input
            className="ha-term-search-input"
            placeholder="Search output..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
          <span className="ha-term-search-count">
            {searchText ? output.split("\n").filter((l) => l.toLowerCase().includes(searchText.toLowerCase())).length : 0} results
          </span>
          <button
            className="ha-btn ha-btn--sm ha-btn--icon"
            onClick={() => { setSearchOpen(false); setSearchText(""); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Output */}
      <div className="ha-term-scroll" ref={scrollRef}>
        {searchText ? (
          <pre className="ha-term-output ha-term-output--filtered">{filteredLines}</pre>
        ) : (
          <pre className="ha-term-output">{output || <span className="ha-term-placeholder">Waiting for output...</span>}</pre>
        )}
      </div>
    </div>
  );
}
