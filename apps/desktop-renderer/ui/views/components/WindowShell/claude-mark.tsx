/** Claude-style sunburst mark (favicon-matched) for the title bar. */
export function ClaudeMark({ size = 14 }: { size?: number }) {
  const spokes = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      <g stroke="#d97757" strokeWidth={6} strokeLinecap="round">
        {spokes.map((deg) => (
          <line
            key={deg}
            x1={32}
            y1={10}
            x2={32}
            y2={54}
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
    </svg>
  );
}
