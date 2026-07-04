import type { ReactNode } from "react";
import {
  BUDGET_OPTIONS,
  CUISINE_OPTIONS,
  DISTANCE_OPTIONS,
  MOOD_OPTIONS,
} from "../data/options";
import { formatBudgetRange } from "../lib/restaurantDisplay";
import {
  BowlIcon,
  ChevronDownIcon,
  DistanceIcon,
  MoneyIcon,
  SearchIcon,
  SmileIcon,
} from "./Icons";

type FilterField = "search" | "cuisine" | "budget" | "mood" | "maxDistanceKm";

type FilterPanelProps = {
  search: string;
  cuisine: string;
  budget: string;
  mood: string;
  maxDistanceKm: number | "";
  onChange: (field: FilterField, value: string | number) => void;
  onClear: () => void;
};

function ChipSelect(props: {
  label: string;
  valueLabel: string;
  icon: ReactNode;
  options: Array<{ label: string; value: string | number }>;
  value: string | number | "";
  onChange: (value: string) => void;
}) {
  const { label, valueLabel, icon, options, value, onChange } = props;

  return (
    <div className="filter-chip">
      <span className="text-green-700">{icon}</span>
      <span className="text-[15px] font-semibold">
        {valueLabel || label}
      </span>
      <ChevronDownIcon className="h-4 w-4 text-slate-500" />
      <select
        aria-label={label}
        className="filter-chip__select"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterPanel({
  search,
  cuisine,
  budget,
  mood,
  maxDistanceKm,
  onChange,
  onClear,
}: FilterPanelProps) {
  const hasActiveFilters =
    search.length > 0 ||
    cuisine.length > 0 ||
    budget.length > 0 ||
    mood.length > 0 ||
    maxDistanceKm !== "";

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Quick filters
        </p>
        <button
          className={`button-quiet min-h-8 px-0 text-sm ${
            hasActiveFilters ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={onClear}
          type="button"
        >
          Clear all
        </button>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 pr-4">
        <ChipSelect
          icon={<MoneyIcon className="h-5 w-5" />}
          label="Budget"
          onChange={(value) => onChange("budget", value)}
          options={BUDGET_OPTIONS.map((option) => ({
            label: formatBudgetRange(option),
            value: option,
          }))}
          value={budget}
          valueLabel={budget ? formatBudgetRange(budget) : ""}
        />

        <ChipSelect
          icon={<BowlIcon className="h-5 w-5" />}
          label="Cuisine"
          onChange={(value) => onChange("cuisine", value)}
          options={CUISINE_OPTIONS.map((option) => ({
            label: option,
            value: option,
          }))}
          value={cuisine}
          valueLabel={cuisine}
        />

        <ChipSelect
          icon={<SmileIcon className="h-5 w-5" />}
          label="Mood"
          onChange={(value) => onChange("mood", value)}
          options={MOOD_OPTIONS.map((option) => ({
            label: option,
            value: option,
          }))}
          value={mood}
          valueLabel={mood}
        />

        <ChipSelect
          icon={<DistanceIcon className="h-5 w-5" />}
          label="Distance"
          onChange={(value) => onChange("maxDistanceKm", value ? Number(value) : "")}
          options={DISTANCE_OPTIONS.map((option) => ({
            label: `Within ${option} km`,
            value: option,
          }))}
          value={maxDistanceKm}
          valueLabel={maxDistanceKm === "" ? "" : `${maxDistanceKm} km`}
        />
      </div>

      <label className="block">
        <span className="sr-only">Search restaurants</span>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-[14px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="ui-input ui-input--with-leading-icon text-[15px]"
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search dish, cuisine, or spot"
            value={search}
          />
        </div>
      </label>
    </section>
  );
}
