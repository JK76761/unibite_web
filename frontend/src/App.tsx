import { Outlet, useLocation } from "react-router-dom";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { ExplorerProvider } from "./context/ExplorerContext";

export default function App() {
  const location = useLocation();
  const shouldShowMobileNav = !location.pathname.startsWith("/restaurants/");

  return (
    <ExplorerProvider>
      <div className="min-h-screen bg-[var(--app-bg)] text-slate-950">
        <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 pb-24 pt-3 sm:px-6 lg:px-8 lg:pb-10 lg:pt-4">
          <Outlet />
        </main>
        {shouldShowMobileNav ? <MobileBottomNav /> : null}
      </div>
    </ExplorerProvider>
  );
}
