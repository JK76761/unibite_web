import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BUDGET_OPTIONS, CUISINE_OPTIONS, MOOD_OPTIONS } from "../data/options";
import { createRestaurant } from "../lib/api";
import { getDistanceBetweenCoordinatesKm } from "../lib/location";
import type { Campus } from "../types/api";
import { MapPinIcon, PlusCircleIcon } from "./Icons";

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
  latitude: number | null;
  longitude: number | null;
};

const DEVICE_LOCATION_ADDRESS_PREFIX = "Pinned from device location";

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
    latitude: null,
    longitude: null,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

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

  const selectedCampus =
    campuses.find((campus) => campus.id === form.campusId) ?? null;

  useEffect(() => {
    if (!selectedCampus || form.latitude === null || form.longitude === null) {
      return;
    }

    const nextDistance = Number(
      getDistanceBetweenCoordinatesKm(
        {
          latitude: selectedCampus.latitude,
          longitude: selectedCampus.longitude,
        },
        {
          latitude: form.latitude,
          longitude: form.longitude,
        },
      ).toFixed(2),
    );

    setForm((current) =>
      current.distanceFromCampusKm === nextDistance
        ? current
        : {
            ...current,
            distanceFromCampusKm: nextDistance,
          },
    );
  }, [form.latitude, form.longitude, selectedCampus]);

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
        latitude: null,
        longitude: null,
      }));
      setLocationError("");
    },
  });

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not support device location.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const nextAddress = selectedCampus
          ? `${DEVICE_LOCATION_ADDRESS_PREFIX} near ${selectedCampus.suburb}`
          : DEVICE_LOCATION_ADDRESS_PREFIX;

        setForm((current) => ({
          ...current,
          latitude: nextLatitude,
          longitude: nextLongitude,
          address:
            !current.address.trim() ||
            current.address.startsWith(DEVICE_LOCATION_ADDRESS_PREFIX)
              ? nextAddress
              : current.address,
        }));
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || "Unable to access your location.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 10000,
      },
    );
  };

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
            latitude: form.latitude ?? undefined,
            longitude: form.longitude ?? undefined,
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

        <div className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span>Location or landmark</span>
            <button
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 text-sm font-semibold text-green-700 transition hover:bg-green-100"
              onClick={requestLocation}
              type="button"
            >
              <MapPinIcon className="h-4 w-4" />
              {isLocating ? "Finding..." : "Use my location"}
            </button>
          </div>

          <input
            className="ui-input"
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
            placeholder="Use my location or add a nearby street, building, or landmark"
            required
            value={form.address}
          />

          <p className="text-xs font-normal leading-5 text-slate-500">
            GPS can prefill this for you. If you know the exact shopfront or
            building name, add it here to help reviewers approve it faster.
          </p>

          {form.latitude !== null && form.longitude !== null ? (
            <div className="surface-soft flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">
                  Device location captured
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                </p>
              </div>

              <button
                className="button-secondary px-4 text-sm"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    latitude: null,
                    longitude: null,
                    distanceFromCampusKm: 0.5,
                    address: current.address.startsWith(
                      DEVICE_LOCATION_ADDRESS_PREFIX,
                    )
                      ? ""
                      : current.address,
                  }))
                }
                type="button"
              >
                Clear location
              </button>
            </div>
          ) : null}

          {locationError ? (
            <p className="rounded-[8px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {locationError}
            </p>
          ) : null}
        </div>

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
          <p className="text-xs font-normal leading-5 text-slate-500">
            {form.latitude !== null && form.longitude !== null
              ? "Auto-filled from your current device location. You can still adjust it if needed."
              : "If you use GPS, this field will auto-fill for you."}
          </p>
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
