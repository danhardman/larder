/**
 * A labelled row of mutually exclusive pill chips — a segmented control for a
 * small set of values. Exposed as a `group` with `aria-pressed` on each option.
 */

export interface ChipOption<T> {
  value: T
  label: string
}

export function ChipRow<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  labelClass = 'text-[14px] font-bold text-text',
}: {
  label: string
  hint?: string
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Override the label typography to match the surrounding form. */
  labelClass?: string
}) {
  return (
    <div role="group" aria-label={label} className="py-2">
      <p className={labelClass}>{label}</p>
      {hint && <p className="mt-[2px] text-[12.5px] leading-[1.5] text-neutral-600">{hint}</p>}
      <div className="mt-2 flex gap-[7px]">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`flex-1 cursor-pointer rounded-full border-[1.5px] px-1 py-[10px] text-[13px] font-bold ${
                on ? 'bg-accent-200 border-accent-500 text-accent-800' : 'bg-bg border-neutral-300 text-neutral-600'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
