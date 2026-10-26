import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRequest } from './interfaces';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UserRequest>();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    // Extract token (expecting "Bearer <token>")
    const [type, idToken] = token.split(' ');

    if (type !== 'Bearer' || !idToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    // Attach raw token for the service layer
    request.idToken = idToken;

    // Verify the Firebase ID token and attach the decoded user so
    // controllers can rely on `req.user.uid`.
    const decoded = await this.authService.verifyIdToken(idToken);
    request.user = decoded;

    if (!request.user?.uid) {
      throw new UnauthorizedException('Token missing uid');
    }

    return true;
  }
}
