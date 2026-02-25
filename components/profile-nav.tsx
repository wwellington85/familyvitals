import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  ["Timeline", "timeline"],
  ["Documents", "documents"],
  ["Vitals", "vitals"],
  ["Add Vitals", "vitals/add"],
  ["Medications", "meds"],
  ["Share", "share"]
] as const;

export function ProfileNav({ profileId, current }: { profileId: string; current: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {links.map(([label, path]) => {
        const href = `/profiles/${profileId}/${path}`;
        return (
          <Link
            key={path}
            href={href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              current === path ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
