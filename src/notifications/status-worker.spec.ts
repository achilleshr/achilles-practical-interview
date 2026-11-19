import { Test, TestingModule } from '@nestjs/testing'
import { NotificationStatus, NotificationType } from '@prisma/client'

import { PrismaModule } from 'src/prisma/prisma.module'
import { PrismaService } from 'src/prisma/prisma.service'
import { SmsProvider } from 'src/sms/sms-provider'

import { NotificationsModule } from './notifications.module'
import { StatusWorker } from './status-worker'

const { SENT, DELIVERED, FAILED } = NotificationStatus

// Different from send-worker.spec.ts: location phone numbers are unique and the
// spec files run in parallel.
const LOCATION_PHONE = '+15555550198'
const CANDIDATE_PHONE = '+15555550124'

describe('StatusWorker', () => {
  let moduleRef: TestingModule
  let worker: StatusWorker
  let sms: SmsProvider
  let prisma: PrismaService
  let companyId: string
  let candidateId: string
  let interviewId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, NotificationsModule],
    }).compile()
    worker = moduleRef.get(StatusWorker)
    sms = moduleRef.get(SmsProvider)
    prisma = moduleRef.get(PrismaService)
  })

  beforeEach(async () => {
    // Fake only the clock, so the provider's messages can settle instantly.
    jest.useFakeTimers({ advanceTimers: true })
    sms.failureRate = 0

    const company = await prisma.company.create({ data: { name: 'Test Co' } })
    const location = await prisma.location.create({
      data: {
        name: 'Test Warehouse',
        address: '1 Test St, Chicago, IL',
        timezone: 'America/Chicago',
        phoneNumber: LOCATION_PHONE,
        companyId: company.id,
      },
    })
    const job = await prisma.job.create({
      data: {
        title: 'Forklift Operator',
        description: 'Test job',
        companyId: company.id,
        locationId: location.id,
      },
    })
    const candidate = await prisma.candidate.create({
      data: {
        firstName: 'Test',
        lastName: 'Candidate',
        email: 'test@example.com',
        phoneNumber: CANDIDATE_PHONE,
      },
    })
    const application = await prisma.application.create({
      data: { candidateId: candidate.id, jobId: job.id },
    })
    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
        applicationId: application.id,
        startsAt: new Date(Date.now() + 2 * 60 * 60_000),
      },
    })

    companyId = company.id
    candidateId = candidate.id
    interviewId = interview.id
  })

  afterEach(async () => {
    jest.useRealTimers()
    // Cascades to location, job, application, interview, and notifications.
    await prisma.company.delete({ where: { id: companyId } })
    await prisma.candidate.delete({ where: { id: candidateId } })
    await prisma.smsProviderMessage.deleteMany({
      where: { from: LOCATION_PHONE },
    })
  })

  afterAll(async () => {
    await moduleRef.close()
  })

  /** A SENT reminder backed by a real message in the mock provider. */
  const createSentNotification = async () => {
    const providerMessageId = await sms.send(
      LOCATION_PHONE,
      CANDIDATE_PHONE,
      'Reminder',
    )
    return prisma.notification.create({
      data: {
        interviewId,
        type: NotificationType.HOURS_2,
        scheduleTime: new Date(),
        status: SENT,
        providerMessageId,
      },
    })
  }

  const reload = (id: string) =>
    prisma.notification.findUniqueOrThrow({ where: { id } })

  const settleMessages = () => jest.setSystemTime(Date.now() + 2000)

  it('marks a delivered message as delivered', async () => {
    const { id } = await createSentNotification()
    settleMessages()

    await worker.tick()

    const notification = await reload(id)
    expect(notification.status).toBe(DELIVERED)
    expect(notification.lockedUntil).toBeNull()
  })

  it('marks a failed message as failed, for the send worker to resend', async () => {
    sms.failNext()
    const { id } = await createSentNotification()
    settleMessages()

    await worker.tick()

    expect((await reload(id)).status).toBe(FAILED)
  })

  it('leaves a queued message as sent, to check again later', async () => {
    const { id } = await createSentNotification()

    await worker.tick()

    const notification = await reload(id)
    expect(notification.status).toBe(SENT)
    expect(notification.lockedUntil).toBeNull()
  })
})
