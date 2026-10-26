import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
