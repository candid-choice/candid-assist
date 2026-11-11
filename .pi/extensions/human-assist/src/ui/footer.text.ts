/** Number formatting for the status line, kept in one place because the
 *  standalone footer and the contributed segment must agree or the two modes
 *  look like different extensions. */
export class FooterText {
  /** Human-readable totals: raw below 1k, k below 1M, M above. */
  static fmt(n: number): string {
    return n < 1000
      ? `${n}`
      : n < 1_000_000
        ? `${(n / 1000).toFixed(1)}k`
        : `${(n / 1_000_000).toFixed(2)}M`;
  }

  /** The connection dot, shared by both modes. */
  static dot(status: FooterStatusLike): string {
    return status === "connected" ? "●" : status === "connecting" ? "◐" : "○";
  }

  static dotColor(status: FooterStatusLike): string {
    return status === "connected" ? "success" : status === "connecting" ? "warning" : "error";
  }
}

type FooterStatusLike = "connected" | "connecting" | "disconnected";
