import { Module } from '@nestjs/common'

import { PrismaModule } from './prisma/prisma.module'
import { RemoteAtsModule } from './remote-ats/remote-ats.module'
import { SyncModule } from './sync/sync.module'

@Module({
  imports: [SyncModule, RemoteAtsModule, PrismaModule],
})
export class AppModule {}
