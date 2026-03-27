interface PoolRatioBarProps {
  readonly upAmount: number;
  readonly downAmount: number;
}

export default function PoolRatioBar({ upAmount, downAmount }: Readonly<PoolRatioBarProps>) {
  const total = upAmount + downAmount;
  if (total <= 0) return null;

  const upRatio = (upAmount / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-medium">
        <span className="text-primary">↑ {upRatio.toFixed(0)}%</span>
        <span className="text-destructive">{(100 - upRatio).toFixed(0)}% ↓</span>
      </div>
      <div className="h-1.5 rounded-full bg-destructive/20 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${upRatio}%` }}
        />
      </div>
    </div>
  );
}
