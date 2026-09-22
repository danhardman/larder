/** Full-screen failure state for anything that stops the app reaching its data. */
export function ErrorScreen({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg px-6">
      <div className="max-w-[430px] rounded-md border border-accent-400 bg-accent-100 px-4 py-3 text-[13px] leading-[1.5] text-accent-800">
        <p className="font-bold">Couldn’t reach the larder.</p>
        <p className="mt-1 break-words">{message}</p>
        <p className="mt-2 text-neutral-700">
          A permission error here usually means the Firestore rules haven’t been deployed for this
          project yet.
        </p>
        {children}
      </div>
    </div>
  )
}
