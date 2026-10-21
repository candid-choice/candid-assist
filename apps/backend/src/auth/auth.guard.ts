import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    // Extract token (expecting "Bearer <token>")
    const [type, idToken] = token.split(' ');
    
    if (type !== 'Bearer' || !idToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    // Attach token to request for service layer to verify
    request.idToken = idToken;

    return true;
  }
}
