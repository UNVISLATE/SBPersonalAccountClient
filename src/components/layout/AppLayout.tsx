import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TopUpModal } from "@/components/finance/TopUpModal";
import styles from "./AppLayout.module.scss";

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.mainWrapper}>
        <Header
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenTopUp={() => setTopUpOpen(true)}
        />
        <main className={styles.content}>
          <Outlet context={{ openTopUp: () => setTopUpOpen(true) }} />
        </main>
      </div>

      <TopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
};
