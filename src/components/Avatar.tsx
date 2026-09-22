interface AvatarProps {
  name: string
}

/** Initial-in-a-circle stand-in for a member's profile picture. */
export function Avatar({ name }: AvatarProps) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[13px] font-bold text-accent-800">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
