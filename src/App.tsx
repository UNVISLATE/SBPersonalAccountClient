import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { router } from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "rgba(20, 20, 22, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fafafa",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 20px 40px -6px rgba(0, 0, 0, 0.8), 0 0 25px -4px var(--color-accent-glow, rgba(0, 144, 128, 0.35))",
              borderRadius: "14px",
              padding: "14px 20px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
};
