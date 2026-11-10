import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getInvoices, getServices } from "@/api/endpoints/user";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useClientLayout } from "@/components/layout/AppLayout";
import { Reveal, Skeleton } from "@/components/motion";
import { ProfileHeader, type ProfileTabId } from "@/components/profile/ProfileHeader";
import { BentoStats } from "@/components/profile/BentoStats";
import { PersonalDataTab } from "@/components/profile/PersonalDataTab";
import { ServicesTab } from "@/components/profile/ServicesTab";
import { PurchasesTab } from "@/components/profile/PurchasesTab";
import { ReferralTab } from "@/components/profile/ReferralTab";
import styles from "./ProfilePage.module.scss";

const TAB_ROUTES: Record<ProfileTabId, string> = {
  profile: "/profile",
  services: "/profile/services",
  purchases: "/profile/payments",
  referral: "/profile/referral",
};

function resolveActiveTab(pathname: string): ProfileTabId {
  if (pathname.startsWith("/profile/services")) return "services";
  if (pathname.startsWith("/profile/payments")) return "purchases";
  if (pathname.startsWith("/profile/referral")) return "referral";
  return "profile";
}

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { branding } = useBranding();
  const { openTopUp, openPromo } = useClientLayout();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = resolveActiveTab(location.pathname);

  const handleTabChange = (nextTab: ProfileTabId) => {
    const targetPath = TAB_ROUTES[nextTab];
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const { data: purchasesSummary } = useQuery({
    queryKey: ["user-purchases"],
    queryFn: async () => {
      try {
        return await getInvoices({ limit: 1, offset: 0 });
      } catch {
        return { items: [], total: 0, limit: 1, offset: 0, has_more: false };
      }
    },
  });

  const { data: servicesSummary } = useQuery({
    queryKey: ["user-services"],
    queryFn: async () => {
      try {
        return await getServices({ limit: 50, offset: 0 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Skeleton height={80} rounded="lg" />
          <Skeleton height={180} rounded="xl" />
          <Skeleton height={280} rounded="xl" />
        </div>
      </div>
    );
  }

  const servicesTotal = servicesSummary?.total ?? (servicesSummary?.items?.length || 0);
  const purchasesTotal = purchasesSummary?.total ?? (purchasesSummary?.items?.length || 0);
  const activeServicesCount = (servicesSummary?.items || []).filter(
    (s) => s.status === "active" || s.status === "delivered"
  ).length;
  const currency = branding.currency || "RUB";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Reveal variant="fade-up" eager>
          <ProfileHeader
            login={user.login}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            servicesCount={servicesTotal}
            purchasesCount={purchasesTotal}
            referralsCount={user.referral_count}
            onOpenTopUp={openTopUp}
            onOpenPromo={openPromo}
          />
        </Reveal>

        <Reveal variant="fade-up" delay={80} eager>
          <BentoStats
            user={user}
            currency={currency}
            purchasesCount={purchasesTotal}
            activeServicesCount={activeServicesCount}
            onAvatarUpdated={refreshUser}
            onOpenTopUp={openTopUp}
          />
        </Reveal>

        <Reveal variant="fade-up" delay={140} eager>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === "profile" && (
                <PersonalDataTab
                  user={user}
                  onUserUpdated={refreshUser}
                  onLogout={logout}
                />
              )}
              {activeTab === "services" && <ServicesTab />}
              {activeTab === "purchases" && (
                <PurchasesTab defaultCurrency={currency} />
              )}
              {activeTab === "referral" && <ReferralTab user={user} />}
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </div>
  );
};
