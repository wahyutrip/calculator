import { Controller, Get } from '@nestjs/common';

/**
 * The entire MVP surface of this service.
 *
 * The web app never calls it — the calculator computes in the browser. It exists
 * so the image, the compose entry and the deploy path are proven before Phase 2
 * needs them.
 */
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  liveness() {
    return {
      status: 'ok',
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.GIT_SHA ?? 'dev',
    };
  }

  @Get('ready')
  readiness() {
    // Phase 2 adds a database ping here. Reporting "ready" while claiming to
    // check a datastore we do not have yet would be a lie the moment it matters.
    return { status: 'ok', checks: { database: 'not-configured' } };
  }
}
