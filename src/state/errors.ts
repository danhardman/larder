/** A Firestore error as one line for the error screen: `code: message`. */
export const describeError = (err: unknown): string => {
  const e = err as { code?: string; message?: string }
  return e?.code ? `${e.code}: ${e.message ?? ''}` : String(err)
}
