import type { CSSProperties } from "react";

export type IconName =
  | "overview"
  | "works"
  | "payments"
  | "materials"
  | "calendar"
  | "team"
  | "catalog"
  | "report"
  | "plus"
  | "search"
  | "close"
  | "edit"
  | "archive"
  | "arrow"
  | "logout"
  | "file"
  | "refresh"
  | "check";
const paths: Record<IconName, string> = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  works: "m5 20 14-14M14 3l7 7M3 14l7 7M9 5l2-2 10 10-2 2",
  payments: "M3 5h18v14H3zM3 9h18M16 14h2",
  materials: "m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7 5l9 5",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h3M14 14h2M8 17h3",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.8M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 3a4 4 0 0 1 0 8",
  catalog: "M4 4h16v5H4zM4 15h16v5H4zM8 4v5M8 15v5",
  report: "M4 3h12l4 4v14H4zM16 3v5h4M8 12h8M8 16h5",
  plus: "M12 5v14M5 12h14",
  search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15 15l6 6",
  close: "m6 6 12 12M6 18 18 6",
  edit: "m15 4 5 5M4 20l4-1L20 7l-4-4L4 15v5Z",
  archive: "M3 3h18v5H3zM5 8v13h14V8M10 12h4",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  logout: "M9 4H4v16h5M10 12h11m-5-5 5 5-5 5",
  file: "M5 3h10l4 4v14H5zM14 3v5h5M9 12h6M9 16h6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M5.5 7a8 8 0 0 1 13-2L20 8M4 16l1.5 3a8 8 0 0 0 13-2",
  check: "m5 12 4 4L19 6",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
