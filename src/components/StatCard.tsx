import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "neutral" | "amber" | "blue" | "green" | "red" | "violet";
}) {
  return (
    <div className={`stat-card stat-tone-${tone}`}>
      <div className="stat-icon">
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
