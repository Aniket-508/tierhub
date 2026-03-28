import { cn } from "@tierhub/ui/lib/utils";

const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="skeleton"
    className={cn("animate-pulse rounded-none bg-muted", className)}
    {...props}
  />
);

export { Skeleton };
