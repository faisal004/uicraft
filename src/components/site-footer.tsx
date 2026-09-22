type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <p className={className}>
      <span>Made by </span>
      <a
        href="https://faisalhusa.in"
        target="_blank"
        rel="noreferrer"
        className="font-heading underline decoration-current/40 underline-offset-4 transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Faisal Husain
      </a>
    </p>
  );
}
