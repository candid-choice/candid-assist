import {
  Controller,
  Get,
  Post,
  Put,
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
import { SessionDoc, EmbeddedSurface } from '../../types/firestore';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Get all active sessions for the current user
   */
  @Get()
  @UseGuards(AuthGuard)
  async getActiveSessions(@Req() req: UserRequest) {
    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.sessionService.getUserSessions(req.user.uid);
  }

  /**
   * Get all sessions (including archived) for the current user
   */
  @Get('all')
  @UseGuards(AuthGuard)
  async getAllSessions(@Req() req: UserRequest) {
    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.sessionService.getAllUserSessions(req.user.uid);
  }

  /**
   * Get a specific session by ID
   */
  @Get(':sessionId')
  @UseGuards(AuthGuard)
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(sessionId);
    
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
  ) {
    if (!title || !workspacePath) {
      throw new BadRequestException('Title and workspace path are required');
    }

    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.sessionService.createSession(req.user.uid, title);
  }

  /**
   * Update session title
   */
  @Patch(':sessionId/title')
  @UseGuards(AuthGuard)
  async updateSessionTitle(
    @Param('sessionId') sessionId: string,
    @Body('title') title: string,
  ) {
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    await this.sessionService.updateSessionTitle(sessionId, title);
    return { success: true };
  }

  /**
   * Update session status
   */
  @Patch(':sessionId/status')
  @UseGuards(AuthGuard)
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body('status') status: 'active' | 'waiting' | 'done' | 'error',
  ) {
    await this.sessionService.updateSessionStatus(sessionId, status);
    return { success: true };
  }

  /**
   * Archive a session (soft delete)
   */
  @Post(':sessionId/archive')
  @UseGuards(AuthGuard)
  async archiveSession(@Param('sessionId') sessionId: string) {
    await this.sessionService.archiveSession(sessionId);
    return { success: true };
  }

  /**
   * Delete a session (hard delete)
   */
  @Delete(':sessionId')
  @UseGuards(AuthGuard)
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.sessionService.deleteSession(sessionId);
    return { success: true };
  }

  /**
   * Add a surface to a session
   */
  @Post(':sessionId/surfaces')
  @UseGuards(AuthGuard)
  async addSurfaceToSession(
    @Param('sessionId') sessionId: string,
    @Body() surface: EmbeddedSurface,
  ) {
    if (!surface) {
      throw new BadRequestException('Surface data is required');
    }

    await this.sessionService.addSurfaceToSession(sessionId, surface);
    return { success: true };
  }

  /**
   * Add a response to a surface in a session
   */
  @Post(':sessionId/surfaces/:surfaceId/response')
  @UseGuards(AuthGuard)
  async addResponseToSurface(
    @Param('sessionId') sessionId: string,
    @Param('surfaceId') surfaceId: string,
    @Body() response: any, // SurfaceUserResponse
  ) {
    await this.sessionService.addResponseToSurface(sessionId, surfaceId, response);
    return { success: true };
  }
}
