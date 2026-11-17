import { Test, TestingModule } from '@nestjs/testing'

import { PrismaModule } from 'src/prisma/prisma.module'
import { PrismaService } from 'src/prisma/prisma.service'

import { SmsProvider, SmsStatus } from './sms-provider'
import { SmsModule } from './sms.module'

describe('SmsProvider', () => {
  let moduleRef: TestingModule
  let sms: SmsProvider
  let prisma: PrismaService
  const sentIds: string[] = []

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, SmsModule],
    }).compile()
    sms = moduleRef.get(SmsProvider)
    prisma = moduleRef.get(PrismaService)
  })

  beforeEach(() => {
    // Fake only the clock, so tests can jump forward in time. Everything else
    // (database calls, timers) keeps running normally.
    jest.useFakeTimers({ advanceTimers: true })
    sms.failureRate = 0
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  afterAll(async () => {
    await prisma.smsProviderMessage.deleteMany({
      where: { id: { in: sentIds } },
    })
    await moduleRef.close()
  })

  it('reports a message as queued, then delivered', async () => {
    const id = await sms.send('+16465550100', '+12125550123', 'Hello')
    sentIds.push(id)
    expect(await sms.getStatus([id])).toEqual([SmsStatus.QUEUED])

    jest.setSystemTime(Date.now() + 2000)
    expect(await sms.getStatus([id])).toEqual([SmsStatus.DELIVERED])
  })

  it('reports a failed message as failed', async () => {
    sms.failNext()
    const id = await sms.send('+16465550100', '+12125550123', 'Hello')
    sentIds.push(id)

    jest.setSystemTime(Date.now() + 2000)
    expect(await sms.getStatus([id])).toEqual([SmsStatus.FAILED])
  })
})
