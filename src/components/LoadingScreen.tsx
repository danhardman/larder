/** Full-screen holding state while auth or the household is still loading. */
export function LoadingScreen({ message = 'Opening the larder…' }: { message?: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg">
      <p className="text-[13px] tracking-[0.08em] text-neutral-600 uppercase">{message}</p>
    </div>
  )
}
