import { Module } from '@nestjs/common'

import { CandidatesModule } from './candidates/candidates.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { RemoteAtsModule } from './remote-ats/remote-ats.module'
import { SmsModule } from './sms/sms.module'
import { SyncModule } from './sync/sync.module'

@Module({
  imports: [
    SyncModule,
    RemoteAtsModule,
    PrismaModule,
    SmsModule,
    CandidatesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
