import { Test, TestingModule } from '@nestjs/testing'

import { PrismaModule } from 'src/prisma/prisma.module'
import { PrismaService } from 'src/prisma/prisma.service'

import { CandidatesModule } from './candidates.module'
import { CandidatesService } from './candidates.service'
import { CandidateEventType } from './dto/candidate-event.dto'

describe('CandidatesService.handleEvent', () => {
  let moduleRef: TestingModule
  let service: CandidatesService
  let prisma: PrismaService
  let candidateId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, CandidatesModule],
    }).compile()
    service = moduleRef.get(CandidatesService)
    prisma = moduleRef.get(PrismaService)
  })

  beforeEach(async () => {
    const candidate = await prisma.candidate.create({
      data: {
        firstName: 'Test',
        lastName: 'Candidate',
        email: 'test@example.com',
        phoneNumber: '+12125550123',
      },
    })
    candidateId = candidate.id
  })

  afterEach(async () => {
    await prisma.candidate.delete({ where: { id: candidateId } })
  })

  afterAll(async () => {
    await moduleRef.close()
  })

  const optedIn = async () =>
    (await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } }))
      .smsOptedIn

  it('opts a candidate out', async () => {
    await service.handleEvent({
      type: CandidateEventType.OPTED_OUT,
      candidateId,
    })
    expect(await optedIn()).toBe(false)
  })

  it('opts a candidate back in', async () => {
    await service.handleEvent({
      type: CandidateEventType.OPTED_OUT,
      candidateId,
    })
    await service.handleEvent({
      type: CandidateEventType.OPTED_IN,
      candidateId,
    })
    expect(await optedIn()).toBe(true)
  })
})
