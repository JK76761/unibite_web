import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createRating } from "../lib/api";
import { StarIcon } from "./Icons";

type RatingFormProps = {
  restaurantId: number;
};

const REVIEWER_STORAGE_KEY = "unibite.reviewer.nickname";

export function RatingForm({ restaurantId }: RatingFormProps) {
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const storedValue = window.localStorage.getItem(REVIEWER_STORAGE_KEY);
    if (storedValue) {
      setReviewerName(storedValue);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      createRating(restaurantId, {
        reviewerName,
        score,
        comment: comment || undefined,
      }),
    onSuccess: async () => {
      setSuccessMessage("Thanks for sharing your review.");
      setScore(5);
      setComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["restaurants"] }),
      ]);
    },
  });

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
          <StarIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
            Student reviews
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Leave your take
          </h2>
        </div>
      </div>

      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          mutation.mutate();
        }}
      >
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Your nickname
          <input
            className="ui-input"
            maxLength={32}
            onChange={(event) => {
              const value = event.target.value;
              setReviewerName(value);
              window.localStorage.setItem(REVIEWER_STORAGE_KEY, value);
            }}
            placeholder="How should your review appear?"
            required
            value={reviewerName}
          />
          <span className="text-xs font-medium text-slate-500">
            Stored on this device only. No login required.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Score
          <select
            className="ui-select"
            onChange={(event) => setScore(Number(event.target.value))}
            value={score}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Comment
          <textarea
            className="ui-textarea"
            onChange={(event) => setComment(event.target.value)}
            placeholder="What made it a good pick for students?"
            value={comment}
          />
        </label>

        <button
          className="button-primary w-full px-6 sm:w-auto"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? "Posting..." : "Post review"}
        </button>

        {successMessage ? (
          <p className="surface-soft px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        {mutation.isError ? (
          <p className="rounded-[8px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {mutation.error.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
