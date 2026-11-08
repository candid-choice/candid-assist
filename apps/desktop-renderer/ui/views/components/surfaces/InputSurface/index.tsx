/** Input surface — structured user input. */

import { useState, useCallback } from "react";

import type { SurfaceConfig, InputPayload } from "../../../types";

import "./index.css";

export interface InputSurfaceProps {
  config: SurfaceConfig<InputPayload>;
  onComplete: (data: unknown) => void;
}

export function InputSurface({ config, onComplete }: InputSurfaceProps) {
  const payload = config.payload;
  const kind = payload.kind;
  const [textValue, setTextValue] = useState(payload.value ?? "");
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  const submit = useCallback(
    (type: "approval" | "dismiss" | "feedback", text: string) => {
      onComplete?.({ type, text });
    },
    [onComplete],
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
  }, []);

  const handleChoiceToggle = useCallback((value: string) => {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }, []);

  // Already answered — show the record and lock the controls. The answer came
  // from main (mirrored push), which is also what the agent reads via
  // readSurface / openInputSurface(waitForAnswer), so a second click must not
  // silently change what the agent is acting on. The read-only portal renders
  // this same state.
  if (payload.answered) {
    const answerText = Array.isArray(payload.answer)
      ? payload.answer.join(", ")
      : (payload.answer ?? "");
    return (
      <div className="ha-input-surface ha-input-surface--answered">
        <div className="ha-input-group">
          {payload.question && <p className="ha-input-question">{payload.question}</p>}
          <p className="ha-input-answer" role="status">
            <span className="ha-input-answer-mark" aria-hidden="true">
              ✓
            </span>
            <span className="ha-input-answer-text">{answerText || "(empty answer)"}</span>
            <span className="ha-input-answer-meta">
              {payload.answeredBy === "agent" ? "by agent" : "answered"}
              {payload.answeredAt ? ` · ${new Date(payload.answeredAt).toLocaleTimeString()}` : ""}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (kind === "text" || kind === "prompt") {
    return (
      <div className="ha-input-surface">
        <div className="ha-input-group">
          {payload.question && <label className="ha-input-label">{payload.question}</label>}
          <input
            className="ha-input"
            type="text"
            value={textValue}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textValue.trim()) {
                submit("feedback", textValue.trim());
              }
            }}
            placeholder={payload.placeholder}
            autoFocus
          />
          <button
            className="ha-input-btn ha-input-btn--submit"
            type="button"
            disabled={!textValue.trim()}
            onClick={() => submit("feedback", textValue.trim())}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  if (kind === "confirm") {
    return (
      <div className="ha-input-surface">
        <div className="ha-input-group">
          <p className="ha-input-question">{payload.question}</p>
          <div className="ha-input-confirm-buttons">
            <button
              className="ha-input-btn ha-input-btn--yes"
              type="button"
              onClick={() => submit("approval", "yes")}
            >
              Yes
            </button>
            <button
              className="ha-input-btn ha-input-btn--no"
              type="button"
              onClick={() => submit("dismiss", "no")}
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "choices" && payload.options) {
    return (
      <div className="ha-input-surface">
        <div className="ha-input-group">
          {payload.question && <p className="ha-input-question">{payload.question}</p>}
          <div className="ha-input-options">
            {payload.options.map((opt: string) => (
              <button
                key={opt}
                className={`ha-input-option${selectedValues.has(opt) ? " ha-input-option--selected" : ""}`}
                onClick={() =>
                  payload.multiSelect ? handleChoiceToggle(opt) : setSelectedValues(new Set([opt]))
                }
                type="button"
              >
                <span className="ha-input-option-check">{selectedValues.has(opt) ? "●" : ""}</span>
                <span className="ha-input-option-label">{opt}</span>
              </button>
            ))}
          </div>
          <button
            className="ha-input-btn ha-input-btn--submit"
            type="button"
            disabled={selectedValues.size === 0}
            onClick={() => submit("feedback", Array.from(selectedValues).join(", "))}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  if (kind === "file") {
    return (
      <div className="ha-input-surface">
        <div className="ha-input-group">
          <label className="ha-input-label">{payload.question || "Select a file"}</label>
          <div className="ha-input-file-area">
            <input type="file" className="ha-input-file" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "voice") {
    return (
      <div className="ha-input-surface">
        <div className="ha-input-group">
          <p className="ha-input-question">{payload.question || "Record your explanation"}</p>
          <div className="ha-input-voice-area">
            <button className="ha-input-voice-btn" type="button">
              ● Start Recording
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="ha-input-surface">No input configured</div>;
}
