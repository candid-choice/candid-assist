import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { UserRequest } from '../../auth/interfaces';
import { SurfaceService } from './surface.service';
import { SurfaceDoc, SurfaceUserResponse } from '../../types/firestore';

@Controller('surfaces')
export class SurfaceController {
  constructor(private readonly surfaceService: SurfaceService) {}

  /**
   * Get all surfaces for a session
   */
  @Get('session/:sessionId')
  @UseGuards(AuthGuard)
  async getSurfacesBySession(
    @Param('sessionId') sessionId: string,
    @Req() req: UserRequest,
  ) {
    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.surfaceService.getSurfacesBySession(sessionId);
  }

  /**
   * Get a specific surface by ID
   */
  @Get(':surfaceId')
  @UseGuards(AuthGuard)
  async getSurface(@Param('surfaceId') surfaceId: string) {
    const surface = await this.surfaceService.getSurface(surfaceId);
    
    if (!surface) {
      throw new BadRequestException('Surface not found');
    }

    return surface;
  }

  /**
   * Get open surfaces for a session
   */
  @Get('session/:sessionId/open')
  @UseGuards(AuthGuard)
  async getOpenSurfaces(
    @Param('sessionId') sessionId: string,
    @Req() req: UserRequest,
  ) {
    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.surfaceService.getOpenSurfaces(sessionId);
  }

  /**
   * Create a new surface
   */
  @Post()
  @UseGuards(AuthGuard)
  async createSurface(
    @Req() req: UserRequest,
    @Body('sessionId') sessionId: string,
    @Body('surfaceType') surfaceType: string,
    @Body('prompt') prompt: string,
    @Body('url') url?: string,
  ) {
    if (!sessionId || !surfaceType || !prompt) {
      throw new BadRequestException('Session ID, surface type, and prompt are required');
    }

    if (!req.user?.uid) {
      throw new BadRequestException('User not authenticated');
    }

    return this.surfaceService.createSurface(sessionId, surfaceType, prompt, url);
  }

  /**
   * Update surface status
   */
  @Patch(':surfaceId/status')
  @UseGuards(AuthGuard)
  async updateSurfaceStatus(
    @Param('surfaceId') surfaceId: string,
    @Body('status') status: 'open' | 'responding' | 'complete' | 'dismissed',
  ) {
    await this.surfaceService.updateSurfaceStatus(surfaceId, status);
    return { success: true };
  }

  /**
   * Add user response to a surface
   */
  @Post(':surfaceId/response')
  @UseGuards(AuthGuard)
  async addResponse(
    @Param('surfaceId') surfaceId: string,
    @Body() response: SurfaceUserResponse,
  ) {
    if (!response || !response.type || !response.text) {
      throw new BadRequestException('Response type and text are required');
    }

    await this.surfaceService.addResponse(surfaceId, response);
    return { success: true };
  }

  /**
   * Dismiss a surface
   */
  @Post(':surfaceId/dismiss')
  @UseGuards(AuthGuard)
  async dismissSurface(@Param('surfaceId') surfaceId: string) {
    await this.surfaceService.dismissSurface(surfaceId);
    return { success: true };
  }
}
