type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "danger" | "blue";
};

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <section className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </section>
  );
}
