import { Module } from '@nestjs/common'

import { SmsModule } from 'src/sms/sms.module'

import { SendWorker } from './send-worker'
import { StatusWorker } from './status-worker'

@Module({
  imports: [SmsModule],
  providers: [SendWorker, StatusWorker],
})
export class NotificationsModule {}
