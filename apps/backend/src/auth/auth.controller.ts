import { Controller, Post, Get, Headers, UseGuards, Req, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UserRequest } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getUser(req: UserRequest) {
    if (!req.user) {
      throw new BadRequestException('User not authenticated');
    }
    return req.user;
  }

  /**
   * Create an email/password account (public endpoint). Returns the same
   * shape as /auth/verify so the desktop can treat it as a session.
   */
  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('displayName') displayName?: string,
  ) {
    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    if (password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }
    return this.authService.emailAuth('register', email, password, displayName);
  }

  /**
   * Email/password sign-in (public endpoint).
   */
  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.emailAuth('login', email, password);
  }

  /**
   * Verify a Firebase ID token (public endpoint).
   * Desktop signs in via Firebase client SDK, then exchanges the ID
   * token here for the user profile. Returns the same token back so
   * the renderer can use it as its Bearer credential.
   */
  @Post('verify')
  async verifyToken(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('token is required');
    }

    const decoded = await this.authService.verifyIdToken(token);

    return {
      token,
      user: {
        id: decoded.uid,
        email: decoded.email ?? '',
        name: decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
        photoURL: decoded.picture ?? undefined,
      },
    };
  }

  /**
   * Verify Firebase ID token and get user profile
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: UserRequest) {
    const user = await this.authService.getUser(this.getUser(req).uid);
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  /**
   * Refresh user profile (sync with Firebase auth)
   */
  @Post('refresh')
  @UseGuards(AuthGuard)
  async refreshProfile(@Req() req: UserRequest) {
    // Get fresh user data from Firebase
    const user = await this.authService.getOrCreateUser(this.getUser(req));
    return user;
  }

  /**
   * Update user workspace
   */
  @Post('workspace')
  @UseGuards(AuthGuard)
  async updateWorkspace(
    @Req() req: UserRequest,
    @Headers('x-workspace-path') workspacePath: string,
    @Headers('x-git-url') gitUrl?: string,
  ) {
    if (!workspacePath) {
      throw new BadRequestException('Workspace path is required');
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
  @Post('mcp')
  @UseGuards(AuthGuard)
  async updateMcpConfig(
    @Req() req: UserRequest,
    @Headers('x-mcp-endpoint') endpoint: string,
    @Headers('x-mcp-active') isActive?: string,
  ) {
    await this.authService.updateUserMcp(this.getUser(req).uid, {
      endpoint,
      active: isActive === 'true',
    });

    return { success: true };
  }

  /**
   * Update user preferences
   */
  @Post('preferences')
  @UseGuards(AuthGuard)
  async updatePreferences(
    @Req() req: UserRequest,
    @Headers('x-theme') theme?: 'light' | 'dark',
    @Headers('x-auto-minimize') autoMinimize?: string,
    @Headers('x-show-notifications') showNotifications?: string,
  ) {
    await this.authService.updateUserPreferences(this.getUser(req).uid, {
      theme: theme || 'dark',
      surfaces: {
        autoMinimize: autoMinimize === 'true' || true,
        showNotifications: showNotifications !== 'false',
      },
    });

    return { success: true };
  }
}
