import { Module } from '@nestjs/common'

import { RemoteAtsController } from './remote-ats.controller'
import { RemoteAtsService } from './remote-ats.service'

@Module({
  providers: [RemoteAtsService],
  exports: [RemoteAtsService],
  controllers: [RemoteAtsController],
})
export class RemoteAtsModule {}
