import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span>
        Made by{" "}
        <a
          href="https://faisalhusa.in"
          target="_blank"
          rel="noreferrer"
          className="font-heading underline decoration-current/40 underline-offset-4 transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Faisal Husain
        </a>
      </span>
      <span className="whitespace-nowrap">
        <span aria-hidden="true">· </span>
        <a
          href="https://github.com/faisal004/uicraft"
          target="_blank"
          rel="noreferrer"
          className="font-heading underline decoration-current/40 underline-offset-4 transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Source on GitHub
        </a>
      </span>
    </p>
  );
}
