import { classNames } from '../../utils/helpers'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
  className?: string
}

export function Slider({ value, onValueChange, min, max, step, className }: SliderProps) {
  const current = value[0] ?? min
  const percent = ((current - min) / (max - min)) * 100

  return (
    <div className={classNames('relative flex items-center w-full py-2', className)}>
      <div className="relative w-full h-2 bg-border rounded-full overflow-hidden">
        <div className="absolute h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onValueChange([parseFloat(e.target.value)])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none -translate-x-1/2"
        style={{ left: `${percent}%` }}
      />
    </div>
  )
}
