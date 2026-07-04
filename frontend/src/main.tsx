import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AddSpotPage } from "./pages/AddSpotPage";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { SavedPage } from "./pages/SavedPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Navigate replace to="/discover" />} />
            <Route path="/discover" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/add" element={<AddSpotPage />} />
            <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
