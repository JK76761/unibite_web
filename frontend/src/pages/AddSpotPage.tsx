import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminDataTools } from "../components/AdminDataTools";
import { AppHeader } from "../components/AppHeader";
import { CompassIcon } from "../components/Icons";
import { RestaurantSuggestionForm } from "../components/RestaurantSuggestionForm";
import { useExplorer } from "../context/ExplorerContext";
import {
  ADMIN_SESSION_INVALIDATED_EVENT,
  expireAdminSession,
  clearStoredAdminKey,
  hasActiveAdminSession,
  setStoredAdminKey,
  touchAdminSession,
} from "../lib/adminSession";
import { checkAdminAccess } from "../lib/api";

export function AddSpotPage() {
  const { campuses, selectedCampus } = useExplorer();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "review" ? "review" : "suggest";
  const [activeTab, setActiveTab] = useState<"suggest" | "review">(initialTab);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [hasUnlockedAdmin, setHasUnlockedAdmin] = useState(() => hasActiveAdminSession());
  const [adminErrorMessage, setAdminErrorMessage] = useState("");

  useEffect(() => {
    setActiveTab(searchParams.get("tab") === "review" ? "review" : "suggest");
  }, [searchParams]);

  useEffect(() => {
    const handleInvalidatedSession = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;

      clearStoredAdminKey();
      setHasUnlockedAdmin(false);
      setAdminKeyInput("");
      setAdminErrorMessage(detail?.message ?? "Admin access expired. Please unlock again.");
    };

    window.addEventListener(
      ADMIN_SESSION_INVALIDATED_EVENT,
      handleInvalidatedSession as EventListener,
    );

    return () => {
      window.removeEventListener(
        ADMIN_SESSION_INVALIDATED_EVENT,
        handleInvalidatedSession as EventListener,
      );
    };
  }, []);

  const adminAccessQuery = useQuery({
    queryKey: ["admin-access", hasUnlockedAdmin],
    queryFn: checkAdminAccess,
    enabled: activeTab === "review" && hasUnlockedAdmin,
    retry: false,
  });

  useEffect(() => {
    if (adminAccessQuery.data?.isAdmin) {
      touchAdminSession();
      setAdminErrorMessage("");
    }
  }, [adminAccessQuery.data]);

  useEffect(() => {
    if (activeTab !== "review" || !hasUnlockedAdmin) {
      return;
    }

    let lastActivityAt = 0;
    const registerActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt < 10000) {
        return;
      }

      lastActivityAt = now;
      touchAdminSession();
    };

    const intervalId = window.setInterval(() => {
      if (!hasActiveAdminSession()) {
        expireAdminSession("Admin session expired after inactivity. Please unlock again.");
      }
    }, 15000);

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true });
    });

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, registerActivity);
      });
    };
  }, [activeTab, hasUnlockedAdmin]);

  const changeTab = (tab: "suggest" | "review") => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);

    if (tab === "review") {
      nextParams.set("tab", "review");
    } else {
      nextParams.delete("tab");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const unlockAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextKey = adminKeyInput.trim();
    if (!nextKey) {
      return;
    }

    setAdminErrorMessage("");
    setStoredAdminKey(nextKey);
    setHasUnlockedAdmin(true);
    await adminAccessQuery.refetch();
  };

  const lockAdmin = () => {
    clearStoredAdminKey();
    setHasUnlockedAdmin(false);
    setAdminKeyInput("");
    setAdminErrorMessage("");
  };

  const shouldShowAdminTools =
    activeTab === "review" &&
    hasUnlockedAdmin &&
    adminAccessQuery.data?.isAdmin &&
    !adminAccessQuery.isError;
  const adminError =
    adminErrorMessage ||
    (adminAccessQuery.isError ? adminAccessQuery.error.message : "");

  return (
    <div className="space-y-5">
      <AppHeader
        subtitle="Know a better lunch stop? Submit it here. Student suggestions stay private until reviewed and approved."
        title="Add a new spot"
      />

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 pr-4">
        <button
          className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
            activeTab === "suggest"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-[var(--border)] bg-white text-slate-700"
          }`}
          onClick={() => changeTab("suggest")}
          type="button"
        >
          Suggest spot
        </button>
        <button
          className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
            activeTab === "review"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-[var(--border)] bg-white text-slate-700"
          }`}
          onClick={() => changeTab("review")}
          type="button"
        >
          Review imports
        </button>
      </div>

      {activeTab === "suggest" ? (
        <RestaurantSuggestionForm
          campuses={campuses}
          defaultCampusId={selectedCampus?.id}
        />
      ) : shouldShowAdminTools ? (
        <div className="space-y-4">
          <div className="surface-soft flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                Admin unlocked
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Imported places can now be reviewed from this device.
              </p>
            </div>

            <button
              className="button-secondary px-4 text-sm"
              onClick={lockAdmin}
              type="button"
            >
              Lock admin
            </button>
          </div>

          <AdminDataTools
            campuses={campuses}
            selectedCampusId={selectedCampus?.id}
          />
        </div>
      ) : (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CompassIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                Admin only
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Unlock import review tools
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review, approve, reject, and clean imported restaurants with the
                admin key configured on the backend.
              </p>
            </div>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={unlockAdmin}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Admin key
              <input
                autoComplete="off"
                className="ui-input"
                onChange={(event) => {
                  setAdminKeyInput(event.target.value);
                  if (adminErrorMessage) {
                    setAdminErrorMessage("");
                  }
                }}
                placeholder="Enter your admin passcode"
                spellCheck={false}
                type="password"
                value={adminKeyInput}
              />
            </label>

            <button
              className="button-primary w-full px-5 sm:w-auto"
              disabled={adminAccessQuery.isFetching || !adminKeyInput.trim()}
              type="submit"
            >
              {adminAccessQuery.isFetching ? "Checking..." : "Unlock admin tools"}
            </button>

            {adminError ? (
              <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {adminError}
              </p>
            ) : null}

            <p className="text-xs text-slate-500">
              Admin access is hidden, expires automatically after inactivity,
              and should only be shared with trusted reviewers.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
