import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/motion/Skeleton";

// Lazy-loaded pages
const AuthPage = lazy(() =>
  import("@/pages/auth/AuthPage").then((m) => ({ default: m.AuthPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/profile/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const OrderCatalogPage = lazy(() =>
  import("@/pages/catalog/OrderCatalogPage").then((m) => ({ default: m.OrderCatalogPage }))
);
const ProductDetailPage = lazy(() =>
  import("@/pages/catalog/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/errors/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

const PageLoader = () => (
  <div style={{ maxWidth: 1360, margin: "0 auto", padding: "36px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    <Skeleton height={48} rounded="lg" />
    <Skeleton height={200} rounded="lg" />
    <Skeleton height={120} rounded="lg" />
  </div>
);

export const router = createBrowserRouter([
  // Guest-only auth routes
  {
    path: "/login",
    element: (
      <GuestRoute>
        <Suspense fallback={<PageLoader />}>
          <AuthPage initialMode="login" />
        </Suspense>
      </GuestRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <GuestRoute>
        <Suspense fallback={<PageLoader />}>
          <AuthPage initialMode="register" />
        </Suspense>
      </GuestRoute>
    ),
  },
  {
    path: "/claim",
    element: (
      <GuestRoute>
        <Suspense fallback={<PageLoader />}>
          <AuthPage initialMode="claim" />
        </Suspense>
      </GuestRoute>
    ),
  },

  // Protected App Layout (entire personal cabinet behind authorization)
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
        path: "catalog",
        element: (
          <Suspense fallback={<PageLoader />}>
            <OrderCatalogPage />
          </Suspense>
        ),
      },
      {
        path: "catalog/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductDetailPage />
          </Suspense>
        ),
      },
      {
        path: "profile",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "profile/services",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "profile/services/:serviceOrderId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "profile/payments",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "profile/referral",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "referral",
        element: <Navigate to="/profile/referral" replace />,
      },
      {
        path: "dashboard",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "*",
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);
