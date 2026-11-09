import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ServicesPage } from "@/pages/services/ServicesPage";
import { ServiceDetailPage } from "@/pages/services/ServiceDetailPage";
import { KeysVaultPage } from "@/pages/keys/KeysVaultPage";
import { BillingHistoryPage } from "@/pages/finance/BillingHistoryPage";
import { OrderCatalogPage } from "@/pages/catalog/OrderCatalogPage";
import { ProfileSettingsPage } from "@/pages/profile/ProfileSettingsPage";

export const router = createBrowserRouter([
  // Guest-only routes
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },

  // Protected customer portal routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "services",
        element: <ServicesPage />,
      },
      {
        path: "services/:id",
        element: <ServiceDetailPage />,
      },
      {
        path: "keys",
        element: <KeysVaultPage />,
      },
      {
        path: "finance",
        element: <BillingHistoryPage />,
      },
      {
        path: "catalog",
        element: <OrderCatalogPage />,
      },
      {
        path: "profile",
        element: <ProfileSettingsPage />,
      },
    ],
  },

  // Fallback
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
