import {
  Controller,
  Post,
  Get,
  Headers,
  UseGuards,
  Req,
  Res,
  Query,
  Body,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Response } from "express";
import { randomBytes } from "crypto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { UserRequest } from "./interfaces";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getUser(req: UserRequest) {
    if (!req.user) {
      throw new BadRequestException("User not authenticated");
    }
    return req.user;
  }

  /**
   * Create an email/password account (public endpoint). Returns the same
   * shape as /auth/verify so the desktop can treat it as a session.
   */
  @Post("register")
  async register(
    @Body("email") email: string,
    @Body("password") password: string,
    @Body("displayName") displayName?: string,
  ) {
    if (!email || !password) {
      throw new BadRequestException("email and password are required");
    }
    if (password.length < 6) {
      throw new BadRequestException("password must be at least 6 characters");
    }
    return this.authService.emailAuth("register", email, password, displayName);
  }

  /**
   * Email/password sign-in (public endpoint).
   */
  @Post("login")
  async login(@Body("email") email: string, @Body("password") password: string) {
    if (!email || !password) {
      throw new BadRequestException("email and password are required");
    }
    return this.authService.emailAuth("login", email, password);
  }

  // ── Google OAuth (public) ─────────────────────────────────────────────

  /** Whether Google sign-in is configured (drives the button UI). */
  @Get("google/status")
  googleStatus() {
    return { enabled: this.authService.googleAuthConfigured() };
  }

  /** Kick off the authorization-code flow (302 to Google). */
  @Get("google/start")
  googleStart(@Res() res: Response) {
    if (!this.authService.googleAuthConfigured()) {
      throw new UnauthorizedException(
        "Google sign-in is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)",
      );
    }
    const state = randomBytes(16).toString("hex");
    // Short-lived CSRF cookie; also sent back as the OAuth state param.
    res.setHeader("Set-Cookie", `ha_gstate=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    res.redirect(this.authService.googleAuthorizeUrl(state));
  }

  /** OAuth callback: exchange, federate into Firebase, bounce to renderer. */
  @Get("google/callback")
  async googleCallback(
    @Req() req: { cookies?: Record<string, string>; headers: Record<string, unknown> },
    @Res() res: Response,
    @Query("code") code: string,
    @Query("state") state: string,
  ) {
    const cookie =
      req.cookies?.ha_gstate ??
      String(req.headers.cookie ?? "")
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("ha_gstate="))
        ?.split("=")[1];
    if (!code) {
      throw new BadRequestException("code is required");
    }
    if (!state || !cookie || state !== cookie) {
      throw new UnauthorizedException("OAuth state mismatch — please retry");
    }

    const { token, user } = await this.authService.googleAuth(code);
    const rendererUrl = process.env.GOOGLE_RENDERER_URL || "http://localhost:3616";
    const frag = new URLSearchParams({
      ha_auth: token,
      ha_user: JSON.stringify(user),
    });
    res.clearCookie("ha_gstate");
    res.redirect(
      `${rendererUrl}/?${new URLSearchParams({ via: "google" }).toString()}#${frag.toString()}`,
    );
  }

  /**
   * Verify a Firebase ID token (public endpoint).
   * Desktop signs in via Firebase client SDK, then exchanges the ID
   * token here for the user profile. Returns the same token back so
   * the renderer can use it as its Bearer credential.
   */
  /** Silent re-mint of an expired (1h) Firebase ID token. Public (no auth
   * header): the caller's ID token is exactly what expired. */
  @Post("refresh-token")
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return this.authService.refreshIdToken(refreshToken);
  }

  @Post("verify")
  async verifyToken(@Body("token") token: string) {
    if (!token) {
      throw new BadRequestException("token is required");
    }

    const decoded = await this.authService.verifyIdToken(token);

    return {
      token,
      user: {
        id: decoded.uid,
        email: decoded.email ?? "",
        name: decoded.name ?? decoded.email?.split("@")[0] ?? "User",
        photoURL: decoded.picture ?? undefined,
      },
    };
  }

  /**
   * Verify Firebase ID token and get user profile
   */
  @Get("me")
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: UserRequest) {
    const user = await this.authService.getUser(this.getUser(req).uid);

    if (!user) {
      throw new BadRequestException("User not found");
    }

    return user;
  }

  /**
   * Refresh user profile (sync with Firebase auth)
   */
  @Post("refresh")
  @UseGuards(AuthGuard)
  async refreshProfile(@Req() req: UserRequest) {
    // Get fresh user data from Firebase
    const user = await this.authService.getOrCreateUser(this.getUser(req));
    return user;
  }

  /**
   * Update user workspace
   */
  @Post("workspace")
  @UseGuards(AuthGuard)
  async updateWorkspace(
    @Req() req: UserRequest,
    @Headers("x-workspace-path") workspacePath: string,
    @Headers("x-git-url") gitUrl?: string,
  ) {
    if (!workspacePath) {
      throw new BadRequestException("Workspace path is required");
    }

    await this.authService.updateUserWorkspace(this.getUser(req).uid, {
      path: workspacePath,
      gitUrl: gitUrl || null,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Update MCP configuration
   */
  @Post("mcp")
  @UseGuards(AuthGuard)
  async updateMcpConfig(
    @Req() req: UserRequest,
    @Headers("x-mcp-endpoint") endpoint: string,
    @Headers("x-mcp-active") isActive?: string,
  ) {
    await this.authService.updateUserMcp(this.getUser(req).uid, {
      endpoint,
      active: isActive === "true",
    });

    return { success: true };
  }

  /**
   * Update user preferences
   */
  @Post("preferences")
  @UseGuards(AuthGuard)
  async updatePreferences(
    @Req() req: UserRequest,
    @Headers("x-theme") theme?: "light" | "dark",
    @Headers("x-auto-minimize") autoMinimize?: string,
    @Headers("x-show-notifications") showNotifications?: string,
  ) {
    await this.authService.updateUserPreferences(this.getUser(req).uid, {
      theme: theme || "dark",
      surfaces: {
        autoMinimize: autoMinimize === "true" || true,
        showNotifications: showNotifications !== "false",
      },
    });

    return { success: true };
  }
}
