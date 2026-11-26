const LABELS = ["Satellite", "Night", "Paper atlas"];

export function TastefulTabsThumbnail() {
  return (
    <span className="flex w-fit items-center rounded-full bg-zinc-100 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:bg-zinc-900 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]">
      {LABELS.map((label, index) => (
        <span
          key={label}
          className={
            index === 0
              ? "inline-flex h-8 items-center rounded-full bg-white px-3.5 text-sm font-medium whitespace-nowrap text-zinc-950 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.1),0_2px_6px_-2px_rgb(0_0_0/0.08)] dark:bg-zinc-700 dark:text-white dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.08),0_2px_6px_-1px_rgb(0_0_0/0.5)]"
              : "inline-flex h-8 items-center px-3.5 text-sm font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400"
          }
        >
          {label}
        </span>
      ))}
    </span>
  );
}
