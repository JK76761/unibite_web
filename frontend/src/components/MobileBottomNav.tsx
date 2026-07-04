import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import {
  BookmarkIcon,
  CompassIcon,
  MapIcon,
  PlusCircleIcon,
} from "./Icons";

const items: Array<{
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { to: "/discover", label: "Discover", Icon: CompassIcon },
  { to: "/map", label: "Map", Icon: MapIcon },
  { to: "/saved", label: "Saved", Icon: BookmarkIcon },
  { to: "/add", label: "Add", Icon: PlusCircleIcon },
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-nav md:hidden" aria-label="Primary">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          className={({ isActive }) =>
            `mobile-nav__item ${isActive ? "mobile-nav__item--active" : ""}`
          }
          key={to}
          to={to}
        >
          <Icon className="h-6 w-6" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
