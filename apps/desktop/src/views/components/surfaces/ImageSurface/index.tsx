/** Image surface — displays an image with annotation toolbar. */

import { useState, useCallback } from "react";

import { IconPencil, IconCircle, IconArrowRight, IconTextCaption } from "@tabler/icons-react";

import type { SurfaceConfig, ImagePayload } from "../../../types";

import { ActionButton } from "../../shared/ActionButton";

import "./index.css";

export interface ImageSurfaceProps {
  config: SurfaceConfig<ImagePayload>;
  onComplete: (data: unknown) => void;
}

type ToolType = "draw" | "circle" | "arrow" | "text" | "crop";

export function ImageSurface({ config }: ImageSurfaceProps) {
  const payload = config.payload;
  const [activeTool, setActiveTool] = useState<ToolType>("draw");

  const handleTool = useCallback((tool: ToolType) => {
    setActiveTool((prev) => (prev === tool ? "draw" : tool));
  }, []);

  const tools = [
    { type: "draw" as ToolType, icon: <IconPencil className="size-[14px]" strokeWidth={2} />, label: "Draw" },
    { type: "circle" as ToolType, icon: <IconCircle className="size-[14px]" strokeWidth={2} />, label: "Circle" },
    { type: "arrow" as ToolType, icon: <IconArrowRight className="size-[14px]" strokeWidth={2} />, label: "Arrow" },
    { type: "text" as ToolType, icon: <IconTextCaption className="size-[14px]" strokeWidth={2} />, label: "Text" },
  ];

  return (
    <div className="ha-image-surface">
      <div className="ha-image-toolbar">
        {tools.map((tool) => (
          <ActionButton key={tool.type} type={tool.type} icon={tool.icon} label={tool.label} active={activeTool === tool.type} onClick={() => handleTool(tool.type)} />
        ))}
      </div>
      <div className="ha-image-container">
        <div className="ha-image-wrapper">
          <canvas className="ha-image-canvas" width={800} height={600} />
          <img src={payload.src} alt={payload.title} className="ha-image-src" />
        </div>
      </div>
    </div>
  );
}
