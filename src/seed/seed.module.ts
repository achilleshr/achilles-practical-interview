import { Module } from '@nestjs/common'

import { SeedController } from './seed.controller'
import { SeedService } from './seed.service'

@Module({
  providers: [SeedService],
  controllers: [SeedController],
})
export class SeedModule {}
