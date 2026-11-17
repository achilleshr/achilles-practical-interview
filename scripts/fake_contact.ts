import { Faker } from '@faker-js/faker'

// Fictional numbers in the reserved 555-0100 to 555-0199 range, in E.164,
// with the time zone of their area code.
export const AREA_CODE_TIMEZONES: Record<string, string> = {
  '212': 'America/New_York',
  '214': 'America/Chicago',
  '303': 'America/Denver',
  '312': 'America/Chicago',
  '317': 'America/Indiana/Indianapolis',
  '404': 'America/New_York',
  '415': 'America/Los_Angeles',
  '602': 'America/Phoenix',
}

export const fakeContact = (
  faker: Faker,
  {
    // About a quarter of candidates have no known time zone.
    hasTimezone = faker.datatype.boolean(0.75),
    areaCode = faker.helpers.objectKey(AREA_CODE_TIMEZONES),
  }: { hasTimezone?: boolean; areaCode?: string } = {},
) => ({
  phoneNumber: `+1${areaCode}55501${faker.string.numeric(2)}`,
  timezone: hasTimezone ? AREA_CODE_TIMEZONES[areaCode] : null,
})
