import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RoiGaugeSize = "card" | "compact";

interface RoiGaugeProps {
  score: number;
  size?: RoiGaugeSize;
  className?: string;
}

const SIZE_CONFIG: Record<RoiGaugeSize, { width: number; height: number; strokeWidth: number; padding: number }> = {
  card: { width: 148, height: 88, strokeWidth: 12, padding: 14 },
  compact: { width: 74, height: 46, strokeWidth: 7, padding: 8 },
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians),
  };
}

export function RoiGauge({ score, size = "card", className }: RoiGaugeProps) {
  const clampedScore = clampScore(score);
  const { width, height, strokeWidth, padding } = SIZE_CONFIG[size];
  const centerX = width / 2;
  const centerY = height - padding;
  const radius = width / 2 - padding;
  const arcPath = `M ${padding} ${centerY} Q ${centerX} ${padding} ${width - padding} ${centerY}`;
  const needleTip = polarToCartesian(centerX, centerY, radius - strokeWidth * 0.75, 180 - clampedScore * 1.8);
  const tickAngles = [180, 135, 90, 45, 0];

  return (
    <div className={cn("relative shrink-0", size === "card" ? "w-[148px]" : "w-[74px]", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" aria-hidden="true">
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-muted/70"
        />

        <motion.path
          d={arcPath}
          fill="none"
          stroke={scoreColor(clampedScore)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clampedScore / 100 }}
          transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
        />

        {tickAngles.map((angle) => {
          const outer = polarToCartesian(centerX, centerY, radius + strokeWidth * 0.3, angle);
          const inner = polarToCartesian(centerX, centerY, radius - strokeWidth * 0.3, angle);
          return (
            <line
              key={angle}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeWidth={size === "card" ? 2 : 1.5}
              className="text-border"
              strokeLinecap="round"
            />
          );
        })}

        <motion.line
          x1={centerX}
          y1={centerY}
          initial={{ x2: centerX, y2: centerY }}
          animate={{ x2: needleTip.x, y2: needleTip.y }}
          transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
          stroke="currentColor"
          strokeWidth={size === "card" ? 3 : 2}
          className="text-foreground"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r={size === "card" ? 6 : 4.5} fill="currentColor" className="text-foreground" />
        <circle cx={centerX} cy={centerY} r={size === "card" ? 2.5 : 2} fill={scoreColor(clampedScore)} />
      </svg>
    </div>
  );
}
