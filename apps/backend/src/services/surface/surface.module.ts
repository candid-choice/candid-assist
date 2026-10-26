import { Module } from '@nestjs/common';
import { SurfaceController } from './surface.controller';
import { SurfaceService } from './surface.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [SurfaceController],
  providers: [SurfaceService],
  exports: [SurfaceService],
})
export class SurfaceModule {}
