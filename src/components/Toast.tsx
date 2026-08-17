export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="animate-pop absolute right-4 bottom-[150px] left-4 z-20 rounded-full bg-sage-800 px-5 py-[13px] text-center text-[13.5px] font-semibold text-sage-100 shadow-lg"
    >
      {message}
    </div>
  )
}
