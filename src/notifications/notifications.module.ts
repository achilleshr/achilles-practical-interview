import { Module } from '@nestjs/common'

import { SmsModule } from 'src/sms/sms.module'

import { SendWorker } from './send-worker'

@Module({
  imports: [SmsModule],
  providers: [SendWorker],
})
export class NotificationsModule {}
