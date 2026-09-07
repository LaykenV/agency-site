type FaqItemProps = {
  question: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function FaqItem({ question, children, defaultOpen }: FaqItemProps) {
  return (
    <details className="faq-item surface-elevated" open={defaultOpen}>
      <summary className="faq-summary">
        <span className="faq-question">{question}</span>
        <svg
          className="faq-chevron"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="faq-answer pb-4">{children}</div>
    </details>
  );
}
