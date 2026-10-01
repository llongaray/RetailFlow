import { Module } from '@nestjs/common';
import { AddonController } from './addon.controller';
import { AddonEngine } from './addon.engine';

@Module({
  controllers: [AddonController],
  providers: [AddonEngine],
  exports: [AddonEngine],
})
export class AddonsModule {}
