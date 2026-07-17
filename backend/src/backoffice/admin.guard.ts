import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Gates the back-office endpoints behind a shared admin token.
 *
 * Back-office is an internal, staff-only surface — never exposed to the
 * storefront — so a single header check is sufficient for the demo.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-admin-token'];
    const expected = process.env.BACKOFFICE_ADMIN_TOKEN || 'dev-admin-token';

    if (!token || token !== expected) {
      throw new UnauthorizedException(
        'Back-office access requires a valid admin token',
      );
    }
    return true;
  }
}
