import { Controller, Get, HttpStatus } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: HttpStatus.OK,
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }
}
