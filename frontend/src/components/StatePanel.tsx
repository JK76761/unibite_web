import type { ReactNode } from "react";

type StatePanelProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function StatePanel({ title, message, action }: StatePanelProps) {
  return (
    <div className="surface-card px-6 py-8 text-center">
      <p className="text-2xl font-extrabold text-slate-950">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {message}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
