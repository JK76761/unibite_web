import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BUDGET_OPTIONS, CUISINE_OPTIONS, MOOD_OPTIONS } from "../data/options";
import { createRestaurant } from "../lib/api";
import type { Campus } from "../types/api";
import { PlusCircleIcon } from "./Icons";

type RestaurantSuggestionFormProps = {
  campuses: Campus[];
  defaultCampusId?: number | null;
};

type FormState = {
  campusId: number;
  name: string;
  address: string;
  cuisine: string;
  budget: string;
  mood: string;
  distanceFromCampusKm: number;
  websiteUrl: string;
  description: string;
};

export function RestaurantSuggestionForm({
  campuses,
  defaultCampusId,
}: RestaurantSuggestionFormProps) {
  const [form, setForm] = useState<FormState>({
    campusId: defaultCampusId ?? campuses[0]?.id ?? 0,
    name: "",
    address: "",
    cuisine: CUISINE_OPTIONS[0],
    budget: "$",
    mood: MOOD_OPTIONS[0],
    distanceFromCampusKm: 0.5,
    websiteUrl: "",
    description: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!form.campusId && campuses[0]) {
      setForm((current) => ({ ...current, campusId: campuses[0].id }));
    }
  }, [campuses, form.campusId]);

  useEffect(() => {
    if (!defaultCampusId || form.name) {
      return;
    }

    setForm((current) => ({ ...current, campusId: defaultCampusId }));
  }, [defaultCampusId, form.name]);

  const submission = useMutation({
    mutationFn: createRestaurant,
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      setForm((current) => ({
        ...current,
        name: "",
        address: "",
        description: "",
        websiteUrl: "",
        distanceFromCampusKm: 0.5,
      }));
    },
  });

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <PlusCircleIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
            Add a spot
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Suggest a restaurant for review
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Student submissions keep the app growing, but they still follow the
            existing approval flow before becoming public.
          </p>
        </div>
      </div>

      <div className="surface-soft mt-5 rounded-[18px] px-4 py-3 text-sm leading-6 text-slate-600">
        Include enough detail for another student to recognise the place quickly. If it is approved later, it joins the public list.
      </div>

      <form
        className="mt-6 grid gap-4 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          submission.mutate({
            campusId: form.campusId,
            name: form.name,
            address: form.address,
            cuisine: form.cuisine,
            budget: form.budget,
            mood: form.mood,
            description: form.description,
            distanceFromCampusKm: form.distanceFromCampusKm,
            websiteUrl: form.websiteUrl || undefined,
          });
        }}
      >
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Campus
          <select
            className="ui-select"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                campusId: Number(event.target.value),
              }))
            }
            value={form.campusId}
          >
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Restaurant name
          <input
            className="ui-input"
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Capstone Cafe"
            required
            value={form.name}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Address
          <input
            className="ui-input"
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
            placeholder="2 George Street, Brisbane City"
            required
            value={form.address}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Cuisine
          <select
            className="ui-select"
            onChange={(event) =>
              setForm((current) => ({ ...current, cuisine: event.target.value }))
            }
            value={form.cuisine}
          >
            {CUISINE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Budget
          <select
            className="ui-select"
            onChange={(event) =>
              setForm((current) => ({ ...current, budget: event.target.value }))
            }
            value={form.budget}
          >
            {BUDGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Mood
          <select
            className="ui-select"
            onChange={(event) =>
              setForm((current) => ({ ...current, mood: event.target.value }))
            }
            value={form.mood}
          >
            {MOOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Distance from campus (km)
          <input
            className="ui-input"
            min="0"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                distanceFromCampusKm: Number(event.target.value),
              }))
            }
            required
            step="0.1"
            type="number"
            value={form.distanceFromCampusKm}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          Website (optional)
          <input
            className="ui-input"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                websiteUrl: event.target.value,
              }))
            }
            placeholder="https://"
            value={form.websiteUrl}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          Why should this be added?
          <textarea
            className="ui-textarea"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="What do students usually order, why is it convenient, and what makes it worth adding?"
            required
            value={form.description}
          />
        </label>

        <div className="lg:col-span-2">
          <button
            className="button-primary w-full px-6 sm:w-auto"
            disabled={submission.isPending || campuses.length === 0}
            type="submit"
          >
            {submission.isPending ? "Submitting..." : "Send for review"}
          </button>
        </div>

        {successMessage ? (
          <p className="surface-soft lg:col-span-2 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        {submission.isError ? (
          <p className="lg:col-span-2 rounded-[8px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submission.error.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
