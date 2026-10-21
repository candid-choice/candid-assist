import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './services/session/session.module';
import { SurfaceModule } from './services/surface/surface.module';

@Module({
  imports: [
    FirebaseModule,
    AuthModule,
    SessionModule,
    SurfaceModule,
    HealthModule,
  ],
})
export class AppModule {}
