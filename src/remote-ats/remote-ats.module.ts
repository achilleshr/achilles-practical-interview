import { Module } from '@nestjs/common'

import { RemoteAtsService } from './remote-ats.service'

@Module({
  providers: [RemoteAtsService],
})
export class RemoteAtsModule {}
