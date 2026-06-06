export function ReasoningTimeline({ steps }: { steps: string[] }) {
  return (
    <div className="timeline">
      {steps.map((step) => (
        <div className="timelineItem" key={step}>{step}</div>
      ))}
    </div>
  );
}
