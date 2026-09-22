import { formatContribution, lineKey, round1, type ShoppingLine } from '../../lib/shoppingList'
import { ChipRow, type ChipOption } from '../../components/ChipRow'
import { CopyIcon } from '../../components/icons'

interface ShoppingScreenProps {
  /** Null when no week has been accepted yet. */
  lines: ShoppingLine[] | null
  weekLabel: string
  /** Every accepted week in the strip; the picker only shows when there's a choice. */
  weekOptions: ChipOption<string>[]
  selectedIso: string
  onSelectWeek: (iso: string) => void
  ticked: Record<string, boolean>
  copied: boolean
  /** Whether each line shows its per-meal breakdown (spec §5's summed ↔ expanded). */
  expanded: boolean
  onToggleExpanded: () => void
  emptyNote: string
  onToggle: (key: string) => void
  onCopy: () => void
  onPlan: () => void
}

export function ShoppingScreen({
  lines,
  weekLabel,
  weekOptions,
  selectedIso,
  onSelectWeek,
  ticked,
  copied,
  expanded,
  onToggleExpanded,
  emptyNote,
  onToggle,
  onCopy,
  onPlan,
}: ShoppingScreenProps) {
  const ready = lines !== null

  return (
    <div>
      <div className="px-5 pt-[26px]">
        <div className="font-heading text-[30px] leading-none">Shopping list</div>
        <div className="mt-[7px] text-[13px] font-medium text-neutral-600">
          {ready ? `${weekLabel} · ${lines.length} lines` : 'Nothing to buy yet'}
        </div>
        {weekOptions.length > 1 && (
          <ChipRow
            label="Week"
            labelClass="hidden"
            options={weekOptions}
            value={selectedIso}
            onChange={onSelectWeek}
          />
        )}
        {ready && (
          <>
            <button
              type="button"
              onClick={onCopy}
              className="btn btn-primary mt-[14px] w-full gap-2 font-bold"
            >
              <CopyIcon size={16} />
              {copied ? 'Copied' : 'Copy the whole list'}
            </button>
            <button
              type="button"
              aria-pressed={expanded}
              onClick={onToggleExpanded}
              className="mt-[10px] cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-bold text-accent-700 underline underline-offset-2"
            >
              {expanded ? 'Hide the breakdown' : 'Show the breakdown'}
            </button>
          </>
        )}
      </div>

      {ready && (
        <div className="flex flex-col gap-[2px] px-5 pt-4">
          {lines.map((line) => {
            const key = lineKey(line)
            const on = !!ticked[key]
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(key)}
                className="flex cursor-pointer items-start gap-[11px] border-0 border-b border-b-divider bg-transparent px-[2px] py-[11px] text-left text-inherit"
              >
                <span
                  className={`mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.75px] border-sage-500 ${
                    on ? 'bg-sage-500' : 'bg-transparent'
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-bg)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: on ? 1 : 0 }}
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span className={`flex-1 ${on ? 'opacity-40' : ''}`}>
                  <span
                    className={`block text-[14.5px] font-bold ${on ? 'line-through' : ''}`}
                  >
                    {round1(line.total)} {line.unit} — {line.name}
                  </span>
                  {expanded && (
                    <span className="mt-[3px] block text-[11.5px] leading-[1.4] text-neutral-600">
                      ↳ {line.contributions.map((c) => formatContribution(c, line.unit)).join(' + ')}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!ready && (
        <div className="px-5 pt-[22px]">
          <div className="rounded-lg border-[1.5px] border-dashed border-neutral-400 bg-neutral-100 px-[22px] py-[26px]">
            <div className="font-heading text-[20px] leading-[1.2]">No list yet</div>
            <div className="mt-[9px] text-[13.5px] leading-[1.55] text-neutral-700" style={{ textWrap: 'pretty' }}>
              {emptyNote}
            </div>
            <button
              type="button"
              onClick={onPlan}
              className="btn btn-primary mt-4 w-full py-[13px] text-[15px] font-bold"
            >
              Plan next week
            </button>
          </div>
        </div>
      )}
      <div className="h-6" />
    </div>
  )
}
