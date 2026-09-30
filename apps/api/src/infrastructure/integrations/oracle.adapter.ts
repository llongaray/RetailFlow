import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OracleLegacyAdapter {
  private readonly logger = new Logger('OracleLegacy');

  async sync(type: string, payload: unknown): Promise<void> {
    this.logger.log(JSON.stringify({ target: 'oracle-legacy', type, payload, mode: 'simulated-adapter' }));
  }
}
