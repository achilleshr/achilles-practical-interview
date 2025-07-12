import { Module } from '@nestjs/common'

import { RemoteAtsModule } from './remote-ats/remote-ats.module'
import { SyncModule } from './sync/sync.module'
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [SyncModule, RemoteAtsModule, PrismaModule],
})
export class AppModule {}
