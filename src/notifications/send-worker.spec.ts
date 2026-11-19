import { Test, TestingModule } from '@nestjs/testing'
import { NotificationStatus, NotificationType } from '@prisma/client'

import { PrismaModule } from 'src/prisma/prisma.module'
import { PrismaService } from 'src/prisma/prisma.service'
import { SmsProvider } from 'src/sms/sms-provider'

import { NotificationsModule } from './notifications.module'
import { SendWorker } from './send-worker'

const { PENDING, SENT, FAILED, OPTED_OUT } = NotificationStatus

const LOCATION_PHONE = '+15555550199'
const CANDIDATE_PHONE = '+15555550123'

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000)

describe('SendWorker', () => {
  let moduleRef: TestingModule
  let worker: SendWorker
  let sms: SmsProvider
  let prisma: PrismaService
  let companyId: string
  let candidateId: string
  let interviewId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, NotificationsModule],
    }).compile()
    worker = moduleRef.get(SendWorker)
    sms = moduleRef.get(SmsProvider)
    prisma = moduleRef.get(PrismaService)
  })

  beforeEach(async () => {
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
        startsAt: minutesFromNow(120),
      },
    })

    companyId = company.id
    candidateId = candidate.id
    interviewId = interview.id
  })

  afterEach(async () => {
    jest.restoreAllMocks()
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

  const createNotification = (
    data: Partial<{
      status: NotificationStatus
      scheduleTime: Date
      retryCount: number
    }> = {},
  ) =>
    prisma.notification.create({
      data: {
        interviewId,
        type: NotificationType.HOURS_2,
        scheduleTime: minutesFromNow(-1),
        ...data,
      },
    })

  const reload = (id: string) =>
    prisma.notification.findUniqueOrThrow({ where: { id } })

  it('sends a due reminder from the location number', async () => {
    const { id } = await createNotification()

    await worker.tick()

    const notification = await reload(id)
    expect(notification.status).toBe(SENT)
    expect(notification.lockedUntil).toBeNull()

    const message = await prisma.smsProviderMessage.findUniqueOrThrow({
      where: { id: notification.providerMessageId! },
    })
    expect(message.from).toBe(LOCATION_PHONE)
    expect(message.to).toBe(CANDIDATE_PHONE)
    expect(message.body).toContain('Forklift Operator')
  })

  it('does not send a reminder that is not due yet', async () => {
    const { id } = await createNotification({ scheduleTime: minutesFromNow(30) })

    await worker.tick()

    expect((await reload(id)).status).toBe(PENDING)
  })

  it('marks the reminder opted out instead of sending', async () => {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { smsOptedIn: false },
    })
    const send = jest.spyOn(sms, 'send')
    const { id } = await createNotification()

    await worker.tick()

    expect((await reload(id)).status).toBe(OPTED_OUT)
    expect(send).not.toHaveBeenCalled()
  })

  it('marks the reminder failed when send throws, and retries it next tick', async () => {
    jest.spyOn(sms, 'send').mockRejectedValueOnce(new Error('provider down'))
    const { id } = await createNotification()

    await worker.tick()

    const failed = await reload(id)
    expect(failed.status).toBe(FAILED)
    expect(failed.retryCount).toBe(0)
    expect(failed.lockedUntil).toBeNull()

    await worker.tick()

    const retried = await reload(id)
    expect(retried.status).toBe(SENT)
    expect(retried.retryCount).toBe(1)
  })

  it('resends a failed reminder and counts the retry', async () => {
    const { id } = await createNotification({ status: FAILED })

    await worker.tick()

    const notification = await reload(id)
    expect(notification.status).toBe(SENT)
    expect(notification.retryCount).toBe(1)
  })

  it('stops resending after 3 retries', async () => {
    const send = jest.spyOn(sms, 'send')
    const { id } = await createNotification({ status: FAILED, retryCount: 3 })

    await worker.tick()

    expect((await reload(id)).status).toBe(FAILED)
    expect(send).not.toHaveBeenCalled()
  })
})
