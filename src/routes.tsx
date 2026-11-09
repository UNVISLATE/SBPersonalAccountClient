import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { ServiceDetailPage } from "@/pages/services/ServiceDetailPage";
import { OrderCatalogPage } from "@/pages/catalog/OrderCatalogPage";

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
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "dashboard",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "catalog",
        element: <OrderCatalogPage />,
      },
      {
        path: "services/:id",
        element: <ServiceDetailPage />,
      },
      {
        path: "services",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "keys",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "finance",
        element: <Navigate to="/profile" replace />,
      },
    ],
  },

  // Fallback
  {
    path: "*",
    element: <Navigate to="/profile" replace />,
  },
]);
