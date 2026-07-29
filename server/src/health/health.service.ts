import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Liveness information for load balancers, container orchestrators and CI.
 */
@Injectable()
export class HealthService {
  private static readonly SERVICE_NAME = 'ludoverse-server';

  getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: HealthService.SERVICE_NAME,
      // APP_VERSION is stamped by the container build; npm_package_version
      // only exists when the process is started through an npm script.
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? 'unknown',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
