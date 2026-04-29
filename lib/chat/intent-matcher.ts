export const MAX_MESSAGE_LENGTH = 2000

export type Intent =
  | 'total_students'
  | 'enrollment_by_year'
  | 'enrollment_by_department'
  | 'enrollment_by_program'
  | 'growth_rate'
  | 'average_age'
  | 'unknown'

// Patterns ordered most-specific first to avoid false matches
const PATTERNS: [Intent, RegExp][] = [
  ['growth_rate',              /\b(growth rate|year.?over.?year|yoy)\b|\b(how much|is the).*(grew|grow|increas|decreas|chang)/i],
  ['average_age',              /\baverage age\b|\bavg age\b|\bmean age\b|\bhow old\b/i],
  ['enrollment_by_year',       /\bby year\b|\bper year\b|\beach year\b|\byearly\b|\bannual(ly)?\b|\byear.?wise\b|\byear breakdown\b|\byear trend\b|\bover the years?\b/i],
  ['enrollment_by_department', /\bby department\b|\bper department\b|\beach department\b|\bdepartment breakdown\b|\bby college\b|\bper college\b/i],
  ['enrollment_by_program',    /\bby program\b|\bper program\b|\beach program\b|\bprogram breakdown\b|\btop programs?\b|\bmost enrolled program\b|\bmost popular program\b/i],
  ['total_students',           /\btotal students\b|\btotal enrollment\b|\bhow many students\b|\bstudent count\b|\bnumber of students\b|\boverall enrollment\b/i],
]

export function matchIntent(message: string): Intent {
  for (const [intent, pattern] of PATTERNS) {
    if (pattern.test(message)) return intent
  }
  return 'unknown'
}
