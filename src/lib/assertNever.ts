/**
 * Exhaustiveness guard for a switch over a union. Passing a value the compiler can
 * still widen is a type error naming the unhandled member, so adding a `PlanStatus`
 * (or any other union member) fails the build at every site that has to handle it
 * rather than falling quietly through to a default.
 *
 * Throws if it is somehow reached at runtime — a document carrying a status this
 * build has never heard of, say — rather than rendering something arbitrary.
 */
export function assertNever(value: never, context = 'value'): never {
  throw new Error(`Unhandled ${context}: ${String(value)}`)
}
