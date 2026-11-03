import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { UserRequest } from '../../auth/interfaces';
import { SessionService } from './session.service';
import { EmbeddedSurface } from '../../types/firestore';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /** All routes are auth-guarded; sessions live under users/{uid}/sessions. */
  private uid(req: UserRequest): string {
    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }
    return req.user.uid;
  }

  /**
   * Get all active sessions for the current user
   */
  @Get()
  @UseGuards(AuthGuard)
  async getActiveSessions(@Req() req: UserRequest) {
    return this.sessionService.getUserSessions(this.uid(req));
  }

  /**
   * Get all sessions (including archived) for the current user
   */
  @Get('all')
  @UseGuards(AuthGuard)
  async getAllSessions(@Req() req: UserRequest) {
    return this.sessionService.getAllUserSessions(this.uid(req));
  }

  /**
   * Get a specific session by ID (scoped to the caller's own subcollection)
   */
  @Get(':sessionId')
  @UseGuards(AuthGuard)
  async getSession(@Req() req: UserRequest, @Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(this.uid(req), sessionId);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    return session;
  }

  /**
   * Create a new session
   */
  @Post()
  @UseGuards(AuthGuard)
  async createSession(
    @Req() req: UserRequest,
    @Body('title') title: string,
    @Body('workspacePath') workspacePath: string,
    @Body('agentSessionId') agentSessionId?: string,
    @Body('agentClient') agentClient?: string,
  ) {
    if (!title || !workspacePath) {
      throw new BadRequestException('Title and workspace path are required');
    }

    return this.sessionService.createSession(this.uid(req), title, {
      agentSessionId,
      agentClient,
    });
  }

  /**
   * Update session title
   */
  @Patch(':sessionId/title')
  @UseGuards(AuthGuard)
  async updateSessionTitle(
    @Req() req: UserRequest,
    @Param('sessionId') sessionId: string,
    @Body('title') title: string,
  ) {
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    await this.sessionService.updateSessionTitle(this.uid(req), sessionId, title);
    return { success: true };
  }

  /**
   * Update session status
   */
  @Patch(':sessionId/status')
  @UseGuards(AuthGuard)
  async updateSessionStatus(
    @Req() req: UserRequest,
    @Param('sessionId') sessionId: string,
    @Body('status') status: 'active' | 'waiting' | 'done' | 'error',
  ) {
    await this.sessionService.updateSessionStatus(this.uid(req), sessionId, status);
    return { success: true };
  }

  /**
   * Archive a session (soft delete)
   */
  @Post(':sessionId/archive')
  @UseGuards(AuthGuard)
  async archiveSession(@Req() req: UserRequest, @Param('sessionId') sessionId: string) {
    await this.sessionService.archiveSession(this.uid(req), sessionId);
    return { success: true };
  }

  /**
   * Delete a session (hard delete)
   */
  @Delete(':sessionId')
  @UseGuards(AuthGuard)
  async deleteSession(@Req() req: UserRequest, @Param('sessionId') sessionId: string) {
    await this.sessionService.deleteSession(this.uid(req), sessionId);
    return { success: true };
  }

  /**
   * Add a surface to a session
   */
  @Post(':sessionId/surfaces')
  @UseGuards(AuthGuard)
  async addSurfaceToSession(
    @Req() req: UserRequest,
    @Param('sessionId') sessionId: string,
    @Body() surface: EmbeddedSurface,
  ) {
    if (!surface) {
      throw new BadRequestException('Surface data is required');
    }

    await this.sessionService.addSurfaceToSession(this.uid(req), sessionId, surface);
    return { success: true };
  }

  /**
   * Add a response to a surface in a session
   */
  @Post(':sessionId/surfaces/:surfaceId/response')
  @UseGuards(AuthGuard)
  async addResponseToSurface(
    @Req() req: UserRequest,
    @Param('sessionId') sessionId: string,
    @Param('surfaceId') surfaceId: string,
    @Body() response: unknown, // SurfaceUserResponse
  ) {
    await this.sessionService.addResponseToSurface(
      this.uid(req),
      sessionId,
      surfaceId,
      response,
    );
    return { success: true };
  }
}
