import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  approveSelectedImportedRestaurants,
  getGooglePlacesPreview,
  getPendingImportedRestaurants,
  importCampusFromOverpass,
  normalizeCampusRestaurantData,
  rejectSelectedImportedRestaurants,
} from "../lib/api";
import { formatDate, formatDistance } from "../lib/format";
import type {
  ApproveSelectedImportedRestaurantsResult,
  Campus,
  GooglePlacesPreview,
  NormalizeRestaurantDataResult,
  OverpassCampusImportResult,
  PendingImportedRestaurant,
  RejectImportedRestaurantsResult,
} from "../types/api";
import {
  BookmarkIcon,
  ChevronRightIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
} from "./Icons";

type AdminDataToolsProps = {
  campuses: Campus[];
  selectedCampusId?: number | null;
};

const radiusOptions = [300, 600, 1200, 1800];
type QueueMode = "all" | "ready" | "caution" | "needs_review" | "reject" | "duplicate";

export function AdminDataTools({
  campuses,
  selectedCampusId,
}: AdminDataToolsProps) {
  const queryClient = useQueryClient();
  const [campusId, setCampusId] = useState(selectedCampusId ?? campuses[0]?.id ?? 0);
  const [radiusMeters, setRadiusMeters] = useState(600);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueMode, setQueueMode] = useState<QueueMode>("all");
  const [lastImportResult, setLastImportResult] =
    useState<OverpassCampusImportResult | null>(null);
  const [approvalResult, setApprovalResult] =
    useState<ApproveSelectedImportedRestaurantsResult | null>(null);
  const [rejectionResult, setRejectionResult] =
    useState<RejectImportedRestaurantsResult | null>(null);
  const [normalizationResult, setNormalizationResult] =
    useState<NormalizeRestaurantDataResult | null>(null);
  const [photoPreviewById, setPhotoPreviewById] = useState<
    Record<number, GooglePlacesPreview>
  >({});

  useEffect(() => {
    if (!campusId && campuses[0]) {
      setCampusId(campuses[0].id);
    }
  }, [campusId, campuses]);

  useEffect(() => {
    if (!selectedCampusId) {
      return;
    }

    setCampusId(selectedCampusId);
  }, [selectedCampusId]);

  useEffect(() => {
    setSelectedIds([]);
    setQueueSearch("");
    setQueueMode("all");
    setLastImportResult(null);
    setApprovalResult(null);
    setRejectionResult(null);
    setNormalizationResult(null);
    setPhotoPreviewById({});
  }, [campusId]);

  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campusId, campuses],
  );

  const pendingImportsQuery = useQuery({
    queryKey: ["pending-imported", campusId, "overpass"],
    queryFn: () =>
      getPendingImportedRestaurants({
        campusId,
        source: "overpass",
      }),
    enabled: Boolean(campusId),
  });

  useEffect(() => {
    const validIds = new Set(
      pendingImportsQuery.data?.restaurants.map((restaurant) => restaurant.id) ?? [],
    );

    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
  }, [pendingImportsQuery.data]);

  const importPreviewMutation = useMutation({
    mutationFn: () =>
      importCampusFromOverpass({
        campusId,
        radiusMeters,
        dryRun: true,
      }),
    onSuccess: (result) => {
      setApprovalResult(null);
      setRejectionResult(null);
      setLastImportResult(result);
    },
  });

  const importSaveMutation = useMutation({
    mutationFn: () =>
      importCampusFromOverpass({
        campusId,
        radiusMeters,
        dryRun: false,
      }),
    onSuccess: async (result) => {
      setApprovalResult(null);
      setRejectionResult(null);
      setLastImportResult(result);
      await queryClient.invalidateQueries({
        queryKey: ["pending-imported", campusId, "overpass"],
      });
    },
  });

  const previewPhotoMutation = useMutation({
    mutationFn: (restaurantId: number) => getGooglePlacesPreview(restaurantId),
    onSuccess: (result) => {
      setPhotoPreviewById((current) => ({
        ...current,
        [result.restaurantId]: result,
      }));
    },
  });

  const approveSelectionMutation = useMutation({
    mutationFn: (restaurantIds: number[]) =>
      approveSelectedImportedRestaurants(restaurantIds),
    onSuccess: async (result) => {
      setApprovalResult(result);
      setRejectionResult(null);
      setSelectedIds([]);
      await invalidateAppData(queryClient, campusId);
    },
  });

  const rejectSelectionMutation = useMutation({
    mutationFn: (restaurantIds: number[]) =>
      rejectSelectedImportedRestaurants(restaurantIds),
    onSuccess: async (result) => {
      setRejectionResult(result);
      setApprovalResult(null);
      setSelectedIds([]);
      await invalidateAppData(queryClient, campusId);
    },
  });

  const normalizeDataMutation = useMutation({
    mutationFn: () => normalizeCampusRestaurantData(campusId),
    onSuccess: async (result) => {
      setNormalizationResult(result);
      await invalidateAppData(queryClient, campusId);
    },
  });

  const pendingRestaurants = pendingImportsQuery.data?.restaurants ?? [];
  const filteredPendingRestaurants = useMemo(() => {
    const normalizedSearch = queueSearch.trim().toLowerCase();
    return pendingRestaurants.filter((restaurant) => {
      const matchesMode =
        queueMode === "all"
          ? true
          : queueMode === "duplicate"
            ? Boolean(restaurant.duplicateHint)
            : restaurant.reviewStatus === queueMode;

      if (!matchesMode) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystacks = [
        restaurant.name,
        restaurant.address,
        restaurant.cuisine,
        restaurant.budget,
        restaurant.mood,
        restaurant.recommendedAction,
        ...(restaurant.flags ?? []),
        ...(restaurant.reviewNotes ?? []),
        restaurant.duplicateHint?.name ?? "",
      ];

      return haystacks.some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [pendingRestaurants, queueMode, queueSearch]);

  const reviewStats = useMemo(
    () => ({
      ready: pendingImportsQuery.data?.readyCount ?? 0,
      caution: pendingImportsQuery.data?.cautionCount ?? 0,
      needsReview: pendingImportsQuery.data?.needsReviewCount ?? 0,
      reject: pendingImportsQuery.data?.rejectCount ?? 0,
      duplicates: pendingRestaurants.filter((restaurant) => restaurant.duplicateHint).length,
      missingPhotos: pendingRestaurants.filter((restaurant) => !restaurant.photoUrl).length,
      missingWebsites: pendingRestaurants.filter((restaurant) => !restaurant.websiteUrl).length,
      flagged: pendingRestaurants.filter((restaurant) => restaurant.flags.length > 0).length,
    }),
    [pendingImportsQuery.data, pendingRestaurants],
  );

  const readyRestaurantIds = useMemo(
    () =>
      pendingRestaurants
        .filter((restaurant) => restaurant.reviewStatus === "ready")
        .map((restaurant) => restaurant.id),
    [pendingRestaurants],
  );

  const riskyRestaurantIds = useMemo(
    () =>
      pendingRestaurants
        .filter((restaurant) =>
          restaurant.reviewStatus === "reject" ||
          restaurant.reviewStatus === "needs_review")
        .map((restaurant) => restaurant.id),
    [pendingRestaurants],
  );

  const isBusy =
    importPreviewMutation.isPending ||
    importSaveMutation.isPending ||
    approveSelectionMutation.isPending ||
    rejectSelectionMutation.isPending ||
    normalizeDataMutation.isPending;

  const allVisibleSelected =
    filteredPendingRestaurants.length > 0 &&
    filteredPendingRestaurants.every((restaurant) => selectedIds.includes(restaurant.id));

  const toggleSelection = (restaurantId: number) => {
    setSelectedIds((current) =>
      current.includes(restaurantId)
        ? current.filter((id) => id !== restaurantId)
        : [...current, restaurantId],
    );
  };

  const handleSelectAll = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        const filteredIds = new Set(filteredPendingRestaurants.map((restaurant) => restaurant.id));
        return current.filter((id) => !filteredIds.has(id));
      }

      const next = new Set(current);
      filteredPendingRestaurants.forEach((restaurant) => next.add(restaurant.id));
      return [...next];
    });
  };

  const handleApproveSelected = () => {
    if (selectedIds.length === 0) {
      return;
    }

    approveSelectionMutation.mutate(selectedIds);
  };

  const handleRejectSelected = () => {
    if (selectedIds.length === 0) {
      return;
    }

    rejectSelectionMutation.mutate(selectedIds);
  };

  const handleSelectReady = () => {
    setSelectedIds((current) => [...new Set([...current, ...readyRestaurantIds])]);
  };

  const handleSelectRisky = () => {
    setSelectedIds((current) => [...new Set([...current, ...riskyRestaurantIds])]);
  };

  const activePreviewRestaurantId = previewPhotoMutation.variables ?? null;
  const activeApproveRestaurantId =
    approveSelectionMutation.variables?.length === 1
      ? approveSelectionMutation.variables[0]
      : null;
  const activeRejectRestaurantId =
    rejectSelectionMutation.variables?.length === 1
      ? rejectSelectionMutation.variables[0]
      : null;

  return (
    <section className="surface-card p-5 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
          <SparklesIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
            Review imports
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Import, clean, and approve places
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pull nearby spots from OpenStreetMap, flag risky records before they
            go live, and clean campus data without leaving the review page.
          </p>
        </div>
      </div>

      <div className="surface-soft mt-5 rounded-[18px] px-4 py-3 text-sm leading-6 text-slate-600">
        Imported places stay private until you approve them. The cleanup action
        also removes fake placeholder websites and refreshes generic imported
        descriptions into student-friendly copy.
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Campus for review
          <select
            className="ui-select"
            onChange={(event) => setCampusId(Number(event.target.value))}
            value={campusId}
          >
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 text-sm font-semibold text-slate-700">
          <span>Pending queue</span>
          <div className="surface-soft flex min-h-[46px] items-center rounded-[8px] px-4 text-sm font-semibold text-slate-700">
            {pendingImportsQuery.isLoading
              ? "Loading..."
              : `${pendingRestaurants.length} awaiting review`}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Ready" value={reviewStats.ready} />
        <StatCard label="Review" value={reviewStats.needsReview} />
        <StatCard label="Duplicate" value={reviewStats.duplicates} />
        <StatCard label="Reject" value={reviewStats.reject} />
      </div>

      <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 pr-4">
        {[
          { mode: "all", label: "All", count: pendingRestaurants.length },
          { mode: "ready", label: "Ready", count: reviewStats.ready },
          { mode: "caution", label: "Caution", count: reviewStats.caution },
          { mode: "needs_review", label: "Review", count: reviewStats.needsReview },
          { mode: "duplicate", label: "Duplicate", count: reviewStats.duplicates },
          { mode: "reject", label: "Reject", count: reviewStats.reject },
        ].map((item) => (
          <button
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
              queueMode === item.mode
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-[var(--border)] bg-white text-slate-700"
            }`}
            key={item.mode}
            onClick={() => setQueueMode(item.mode as QueueMode)}
            type="button"
          >
            {item.label}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {reviewStats.missingPhotos} without photos and {reviewStats.missingWebsites} without
        websites still need a quick manual check before they go live.
      </p>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-700">Search radius</p>
        <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 pr-4">
          {radiusOptions.map((option) => (
            <button
              className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
                radiusMeters === option
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-[var(--border)] bg-white text-slate-700"
              }`}
              key={option}
              onClick={() => setRadiusMeters(option)}
              type="button"
            >
              {option} m
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <button
          className="button-secondary w-full px-4 text-sm"
          disabled={!selectedCampus || isBusy}
          onClick={() => importPreviewMutation.mutate()}
          type="button"
        >
          {importPreviewMutation.isPending ? "Checking..." : "Preview import"}
        </button>

        <button
          className="button-primary w-full px-4 text-sm"
          disabled={!selectedCampus || isBusy}
          onClick={() => importSaveMutation.mutate()}
          type="button"
        >
          {importSaveMutation.isPending ? "Importing..." : "Import to review"}
        </button>

        <button
          className="button-secondary w-full px-4 text-sm"
          disabled={!selectedCampus || isBusy}
          onClick={() => normalizeDataMutation.mutate()}
          type="button"
        >
          {normalizeDataMutation.isPending ? "Cleaning..." : "Clean campus data"}
        </button>
      </div>

      {(importPreviewMutation.isError ||
        importSaveMutation.isError ||
        pendingImportsQuery.isError ||
        approveSelectionMutation.isError ||
        rejectSelectionMutation.isError ||
        normalizeDataMutation.isError) ? (
        <p className="mt-4 rounded-[8px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {importPreviewMutation.error?.message ||
            importSaveMutation.error?.message ||
            pendingImportsQuery.error?.message ||
            approveSelectionMutation.error?.message ||
            rejectSelectionMutation.error?.message ||
            normalizeDataMutation.error?.message}
        </p>
      ) : null}

      {lastImportResult ? (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                Last import
              </p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
                {lastImportResult.campusName}
              </h3>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
              {lastImportResult.dryRun ? "Preview only" : "Saved for review"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Found" value={lastImportResult.discoveredCount} />
            <StatCard label="Inserted" value={lastImportResult.insertedCount} />
            <StatCard label="Updated" value={lastImportResult.updatedCount} />
            <StatCard label="Matched" value={lastImportResult.duplicateCount} />
          </div>
        </section>
      ) : null}

      {normalizationResult ? (
        <section className="mt-6 rounded-[18px] border border-sky-100 bg-sky-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
            Data cleanup
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
            {normalizationResult.updatedCount} records refreshed in{" "}
            {normalizationResult.campusName}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <StatCard label="Scanned" value={normalizationResult.scannedCount} />
            <StatCard
              label="Classified"
              value={normalizationResult.classificationsUpdatedCount}
            />
            <StatCard
              label="Descriptions"
              value={normalizationResult.descriptionsRefreshedCount}
            />
            <StatCard
              label="Websites cleared"
              value={normalizationResult.websitesClearedCount}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
              Imported queue
            </p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
              Review imported places
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="button-quiet min-h-10 px-0 text-sm"
              disabled={filteredPendingRestaurants.length === 0}
              onClick={handleSelectAll}
              type="button"
            >
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>

            <button
              className="button-quiet min-h-10 px-0 text-sm"
              disabled={readyRestaurantIds.length === 0}
              onClick={handleSelectReady}
              type="button"
            >
              Select ready
            </button>

            <button
              className="button-quiet min-h-10 px-0 text-sm text-rose-700"
              disabled={riskyRestaurantIds.length === 0}
              onClick={handleSelectRisky}
              type="button"
            >
              Select risky
            </button>

            <button
              className="button-secondary hidden px-4 text-sm md:inline-flex"
              disabled={selectedIds.length === 0 || isBusy}
              onClick={handleApproveSelected}
              type="button"
            >
              {approveSelectionMutation.isPending
                ? "Approving..."
                : `Approve (${selectedIds.length})`}
            </button>

            <button
              className="button-secondary hidden px-4 text-sm text-rose-700 md:inline-flex"
              disabled={selectedIds.length === 0 || isBusy}
              onClick={handleRejectSelected}
              type="button"
            >
              {rejectSelectionMutation.isPending
                ? "Removing..."
                : `Reject (${selectedIds.length})`}
            </button>
          </div>
        </div>

        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="ui-input pl-11"
            onChange={(event) => setQueueSearch(event.target.value)}
            placeholder="Search imported places, flags, or duplicate names"
            value={queueSearch}
          />
        </label>

        {pendingImportsQuery.isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="surface-card h-28 animate-pulse" key={index} />
            ))}
          </div>
        ) : pendingRestaurants.length === 0 ? (
          <div className="surface-soft rounded-[18px] px-4 py-5 text-sm text-slate-600">
            No imported places are waiting for approval for this campus. Try an
            import first.
          </div>
        ) : filteredPendingRestaurants.length === 0 ? (
          <div className="surface-soft rounded-[18px] px-4 py-5 text-sm text-slate-600">
            No imported places match that search.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPendingRestaurants.map((restaurant) => {
              const preview = photoPreviewById[restaurant.id];
              const isSelected = selectedIds.includes(restaurant.id);
              const isPreviewLoading =
                previewPhotoMutation.isPending &&
                activePreviewRestaurantId === restaurant.id;
              const isApprovingSingle =
                approveSelectionMutation.isPending &&
                activeApproveRestaurantId === restaurant.id;
              const isRejectingSingle =
                rejectSelectionMutation.isPending &&
                activeRejectRestaurantId === restaurant.id;

              return (
                <ImportedRestaurantRow
                  isApprovingSingle={isApprovingSingle}
                  isPreviewLoading={isPreviewLoading}
                  isRejectingSingle={isRejectingSingle}
                  isSelected={isSelected}
                  onApprove={() => approveSelectionMutation.mutate([restaurant.id])}
                  onPreview={() => previewPhotoMutation.mutate(restaurant.id)}
                  onReject={() => rejectSelectionMutation.mutate([restaurant.id])}
                  onToggleSelected={() => toggleSelection(restaurant.id)}
                  preview={preview}
                  key={restaurant.id}
                  restaurant={restaurant}
                />
              );
            })}
          </div>
        )}
      </section>

      {approvalResult ? (
        <section className="mt-6 rounded-[18px] border border-green-100 bg-green-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
            Approved
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
            {approvalResult.approvedCount} spots are now public
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The discover list and map pins have been refreshed across the app.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="button-primary px-4 text-sm" to="/discover">
              Open discover
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
            <Link className="button-secondary px-4 text-sm" to="/map">
              Open map
            </Link>
          </div>
        </section>
      ) : null}

      {rejectionResult ? (
        <section className="mt-6 rounded-[18px] border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">
            Removed from queue
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
            {rejectionResult.deletedCount} imports were removed
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use import again later if you want to revisit those places.
          </p>
        </section>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[72px] z-40 px-4 md:hidden">
          <div className="mx-auto flex max-w-[640px] items-center gap-2 rounded-[18px] border border-[var(--border)] bg-white px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                {selectedIds.length} selected
              </p>
              <p className="truncate text-sm text-slate-600">
                Approve ready spots or reject risky imports from here.
              </p>
            </div>

            <button
              className="button-secondary min-h-11 px-3 text-sm"
              disabled={isBusy}
              onClick={handleRejectSelected}
              type="button"
            >
              Reject
            </button>
            <button
              className="button-primary min-h-11 px-3 text-sm"
              disabled={isBusy}
              onClick={handleApproveSelected}
              type="button"
            >
              Approve
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ImportedRestaurantRow({
  isApprovingSingle,
  isPreviewLoading,
  isRejectingSingle,
  isSelected,
  onApprove,
  onPreview,
  onReject,
  onToggleSelected,
  preview,
  restaurant,
}: {
  isApprovingSingle: boolean;
  isPreviewLoading: boolean;
  isRejectingSingle: boolean;
  isSelected: boolean;
  onApprove: () => void;
  onPreview: () => void;
  onReject: () => void;
  onToggleSelected: () => void;
  preview?: GooglePlacesPreview;
  restaurant: PendingImportedRestaurant;
}) {
  return (
    <article className="surface-soft rounded-[18px] p-4">
      <div className="flex items-start gap-3">
        <label className="pt-1">
          <input
            checked={isSelected}
            className="h-4 w-4 accent-[var(--green)]"
            onChange={onToggleSelected}
            type="checkbox"
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-slate-950">
                {restaurant.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {restaurant.cuisine} · {restaurant.budget} · {restaurant.mood} ·{" "}
                {formatDistance(restaurant.distanceFromCampusKm)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{restaurant.address}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getReviewBadgeClassName(restaurant.reviewStatus)}`}>
                {formatReviewStatus(restaurant.reviewStatus)} · {restaurant.reviewScore}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                {restaurant.externalSource ?? "imported"}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-[14px] border border-[var(--border)] bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {restaurant.recommendedAction}
            </p>
            {restaurant.reviewNotes.length > 0 ? (
              <div className="mt-1 space-y-1">
                {restaurant.reviewNotes.slice(0, 2).map((note) => (
                  <p className="text-sm text-slate-600" key={note}>
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {restaurant.flags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {restaurant.flags.map((flag) => (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    flag.includes("duplicate")
                      ? "bg-amber-50 text-amber-700"
                      : flag.includes("No")
                        ? "bg-slate-100 text-slate-700"
                        : "bg-sky-50 text-sky-700"
                  }`}
                  key={flag}
                >
                  {flag}
                </span>
              ))}
            </div>
          ) : null}

          {restaurant.duplicateHint ? (
            <div className="mt-3 rounded-[14px] border border-amber-100 bg-amber-50/80 px-3 py-3">
              <p className="text-sm font-semibold text-amber-900">
                Similar to {restaurant.duplicateHint.name}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {restaurant.duplicateHint.matchReason} ·{" "}
                {formatDistance(restaurant.duplicateHint.distanceKm)} away ·{" "}
                {restaurant.duplicateHint.isApproved ? "already live" : "still in queue"}
              </p>
              {restaurant.duplicateHint.isApproved ? (
                <Link
                  className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline-offset-2 hover:underline"
                  to={`/restaurants/${restaurant.duplicateHint.restaurantId}`}
                >
                  Open live restaurant
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="button-secondary px-3.5 text-sm"
              onClick={onPreview}
              type="button"
            >
              <SearchIcon className="h-4 w-4" />
              {isPreviewLoading ? "Loading..." : "Photo preview"}
            </button>

            <button
              className="button-primary px-3.5 text-sm"
              onClick={onApprove}
              type="button"
            >
              <BookmarkIcon className="h-4 w-4" />
              {isApprovingSingle ? "Approving..." : "Approve"}
            </button>

            <button
              className="button-secondary px-3.5 text-sm text-rose-700"
              onClick={onReject}
              type="button"
            >
              {isRejectingSingle ? "Removing..." : "Reject"}
            </button>
          </div>

          {restaurant.lastSyncedAtUtc ? (
            <p className="mt-3 text-xs text-slate-500">
              Imported {formatDate(restaurant.lastSyncedAtUtc)}
            </p>
          ) : null}

          {preview ? (
            <div className="mt-4 rounded-[16px] border border-[var(--border)] bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <MapPinIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {preview.matchedName ?? "Google Places preview"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{preview.message}</p>
                  {preview.formattedAddress ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {preview.formattedAddress}
                    </p>
                  ) : null}
                </div>
              </div>

              {preview.photoUrl ? (
                <div className="mt-3 overflow-hidden rounded-[14px] border border-[var(--border)]">
                  <img
                    alt={`${restaurant.name} Google preview`}
                    className="h-40 w-full object-cover"
                    src={preview.photoUrl}
                  />
                </div>
              ) : null}

              {preview.photoAttribution ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Photo attribution: {preview.photoAttribution}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {preview.googleMapsUri ? (
                  <a
                    className="button-secondary px-3 text-sm"
                    href={preview.googleMapsUri}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open in Google Maps
                  </a>
                ) : null}

                {preview.websiteUrl ? (
                  <a
                    className="button-secondary px-3 text-sm"
                    href={preview.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Visit matched site
                  </a>
                ) : null}

                {typeof preview.distanceMeters === "number" ? (
                  <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-600">
                    {Math.round(preview.distanceMeters)} m away
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-soft p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function formatReviewStatus(reviewStatus: QueueMode | PendingImportedRestaurant["reviewStatus"]) {
  switch (reviewStatus) {
    case "ready":
      return "Ready";
    case "caution":
      return "Caution";
    case "needs_review":
      return "Review";
    case "reject":
      return "Reject";
    case "duplicate":
      return "Duplicate";
    default:
      return "All";
  }
}

function getReviewBadgeClassName(reviewStatus: PendingImportedRestaurant["reviewStatus"]) {
  switch (reviewStatus) {
    case "ready":
      return "bg-green-50 text-green-700";
    case "caution":
      return "bg-sky-50 text-sky-700";
    case "needs_review":
      return "bg-amber-50 text-amber-800";
    case "reject":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

async function invalidateAppData(queryClient: ReturnType<typeof useQueryClient>, campusId: number) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["pending-imported", campusId, "overpass"],
    }),
    queryClient.invalidateQueries({ queryKey: ["restaurants"] }),
    queryClient.invalidateQueries({ queryKey: ["campuses"] }),
    queryClient.invalidateQueries({ queryKey: ["restaurant"] }),
  ]);
}
