import { Controller, Post, Get, Headers, UseGuards, Req, BadRequestException } from '@nestjs/common';
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
