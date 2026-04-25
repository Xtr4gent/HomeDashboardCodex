type StatusPillProps = {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger" | "blue";
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return <span className={`status-pill tone-${tone}`}>{children}</span>;
}
