import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useExplorer } from "../context/ExplorerContext";
import {
  ChevronDownIcon,
  CompassIcon,
  LeafBadgeIcon,
  MapIcon,
  MapPinIcon,
  PlusCircleIcon,
  BookmarkIcon,
} from "./Icons";

type AppHeaderProps = {
  actions?: ReactNode;
  hideTitleOnMobile?: boolean;
  subtitle: string;
  title: string;
};

const desktopNavItems = [
  { to: "/discover", label: "Discover", Icon: CompassIcon },
  { to: "/map", label: "Map", Icon: MapIcon },
  { to: "/saved", label: "Saved", Icon: BookmarkIcon },
  { to: "/add", label: "Add a spot", Icon: PlusCircleIcon },
];

function getCampusLabel(args: {
  isError: boolean;
  isLoading: boolean;
  selectedCampusName?: string;
}) {
  if (args.isError) {
    return "Campus unavailable";
  }

  if (args.isLoading) {
    return "Loading campus...";
  }

  return args.selectedCampusName ?? "Select campus";
}

export function AppHeader({
  actions,
  hideTitleOnMobile = false,
  subtitle,
  title,
}: AppHeaderProps) {
  const { campuses, campusesQuery, selectedCampus, setCampusId } = useExplorer();

  const campusLabel = getCampusLabel({
    isError: campusesQuery.isError,
    isLoading: campusesQuery.isLoading,
    selectedCampusName: selectedCampus?.name,
  });

  return (
    <header className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <NavLink
              className="inline-flex items-end gap-1 text-[clamp(1.95rem,7vw,2.6rem)] font-extrabold leading-none tracking-[-0.05em]"
              to="/discover"
            >
              <span className="text-green-700">Uni</span>
              <span className="text-orange-500">Bite</span>
              <LeafBadgeIcon className="mb-2 h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
            </NavLink>
          </div>

          <div className={hideTitleOnMobile ? "hidden md:block" : ""}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
              Student food finder
            </p>
            <h1 className="mt-1 text-[1.85rem] font-extrabold tracking-tight text-slate-950 sm:text-[2.4rem]">
              {title}
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-600 sm:block sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-3 lg:w-[320px]">
          <div className="relative min-w-0">
            <div className="flex h-12 items-center rounded-[16px] border border-[var(--border)] bg-white pl-[52px] pr-[44px] text-[14px] font-semibold text-slate-950 shadow-sm sm:text-[15px]">
              <span className="truncate">{campusLabel}</span>
            </div>
            <MapPinIcon className="pointer-events-none absolute left-[14px] top-1/2 h-4 w-4 -translate-y-1/2 text-green-700" />
            <select
              aria-label="Select campus"
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[16px] opacity-0"
              disabled={campusesQuery.isLoading || campusesQuery.isError}
              onChange={(event) => setCampusId(Number(event.target.value))}
              value={selectedCampus?.id ?? ""}
            >
              {!campuses.length ? (
                <option disabled value="">
                  {campusesQuery.isError ? "Campus unavailable" : "Loading campus..."}
                </option>
              ) : null}
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-[14px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      <nav className="hidden gap-2 md:flex" aria-label="Page">
        {desktopNavItems.map(({ to, label, Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                isActive
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`
            }
            key={to}
            to={to}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
