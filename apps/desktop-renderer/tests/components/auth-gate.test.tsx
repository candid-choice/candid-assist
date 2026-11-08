/** Auth gate tests: signed-out users see the splash, not the workspace. */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/views/context/auth-provider", () => ({
  useAuth: () => ({
    status: "unauthorized",
    user: null,
    isLoading: false,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import { SplashScreen } from "@/views/components/SplashScreen";
import { useStore } from "@/views/store";

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStore.setState({ signInOpen: false, signInMode: "signin", authToken: null, authUser: null });
});

describe("SplashScreen (signed-out front door)", () => {
  it("offers sign in and create account, wiring the store mode", () => {
    render(<SplashScreen />);
    expect(screen.getByText("Human Assist")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(useStore.getState().signInOpen).toBe(true);
    expect(useStore.getState().signInMode).toBe("register");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(useStore.getState().signInMode).toBe("signin");
  });

  it('has no path into sessions (no dismiss, no "continue without account")', () => {
    render(<SplashScreen />);
    expect(screen.queryByText("Continue without account")).toBeNull();
    expect(screen.queryByLabelText(/dismiss|close/i)).toBeNull();
  });
});
