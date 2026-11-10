import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getCategories, getServices } from "@/api/endpoints/catalog";
import type { CatalogCategory, CatalogService } from "@/api/types";
import { useBranding } from "@/hooks/use-branding";
import { useInfiniteSentinel } from "@/hooks/use-infinite-sentinel";
import { Reveal, Skeleton } from "@/components/motion";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { CategoryBar } from "@/components/catalog/CategoryBar";
import { ServiceCard } from "@/components/catalog/ServiceCard";
import {
  ArrowUpDown,
  CircleDollarSign,
  Clock,
  Flame,
  Loader2,
  PackageX,
  Star,
} from "lucide-react";
import clsx from "clsx";
import styles from "./OrderCatalogPage.module.scss";

type SortOption = "recommended" | "newest" | "popularity" | "price_asc" | "price_desc";

const CATALOG_BATCH_SIZE = 10;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const OrderCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { branding } = useBranding();
  const urlCatId = searchParams.get("cat");

  const [selectedCatId, setSelectedCatId] = useState<number | "all">(
    urlCatId ? Number(urlCatId) : "all"
  );
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  const { data: categories = [], isLoading: isLoadingCats } = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async () => {
      try {
        return await getCategories();
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories]
  );

  const subCategories = useMemo(() => {
    if (selectedCatId === "all") return [];
    return categories.filter((c) => c.parent_id === selectedCatId);
  }, [categories, selectedCatId]);

  const backendCatalogId = useMemo(() => {
    if (selectedSubCatId !== "all") return selectedSubCatId;
    if (selectedCatId !== "all" && subCategories.length === 0) return selectedCatId;
    return undefined;
  }, [selectedCatId, selectedSubCatId, subCategories.length]);

  const {
    data: servicesPages,
    isLoading: isLoadingServices,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["catalog-services", "infinite", backendCatalogId ?? "all"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        return await getServices({
          catalog_id: backendCatalogId,
          limit: CATALOG_BATCH_SIZE,
          offset: pageParam,
        });
      } catch {
        return {
          items: [],
          total: 0,
          limit: CATALOG_BATCH_SIZE,
          offset: pageParam,
          has_more: false,
        };
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
    staleTime: 30_000,
  });

  const sentinelRef = useInfiniteSentinel({
    enabled: Boolean(hasNextPage),
    hasNextPage,
    isFetchingNextPage,
    onLoadMore: () => {
      void fetchNextPage();
    },
  });

  const services = useMemo(() => {
    const map = new Map<number, CatalogService>();
    for (const page of servicesPages?.pages ?? []) {
      for (const item of page.items || []) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [servicesPages]);

  const totalAvailable = servicesPages?.pages?.[0]?.total ?? services.length;

  const activeCategory = useMemo(() => {
    if (selectedCatId === "all") return null;
    return categories.find((c) => c.id === selectedCatId) || null;
  }, [categories, selectedCatId]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, CatalogCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const filteredServices = useMemo(() => {
    const list = services.filter((svc) => {
      if (selectedSubCatId !== "all") {
        if (svc.catalog_id !== selectedSubCatId) return false;
      } else if (selectedCatId !== "all") {
        const matchesRoot = svc.catalog_id === selectedCatId;
        const matchesChild = subCategories.some((sc) => sc.id === svc.catalog_id);
        if (!matchesRoot && !matchesChild) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = svc.name.toLowerCase().includes(q);
        const descMatch = svc.description ? svc.description.toLowerCase().includes(q) : false;
        if (!nameMatch && !descMatch) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "recommended": {
          const recA = a.is_recommended ? 1 : 0;
          const recB = b.is_recommended ? 1 : 0;
          if (recA !== recB) return recB - recA;
          return b.id - a.id;
        }
        case "newest":
          return b.id - a.id;
        case "popularity":
          return (b.orders_count || 0) - (a.orders_count || 0);
        case "price_asc":
          return Number(a.price) - Number(b.price);
        case "price_desc":
          return Number(b.price) - Number(a.price);
        default:
          return 0;
      }
    });
  }, [services, selectedCatId, selectedSubCatId, subCategories, searchQuery, sortBy]);

  const handleSelectRoot = (id: number | "all") => {
    setSelectedCatId(id);
    setSelectedSubCatId("all");
    if (id === "all") {
      searchParams.delete("cat");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ cat: String(id) });
    }
  };

  const isLoading = isLoadingCats || isLoadingServices;
  const defaultCurrency = branding.currency || "RUB";
  const heroTotalCount =
    selectedCatId === "all" && !searchQuery.trim()
      ? totalAvailable
      : filteredServices.length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Reveal variant="fade-up" eager>
          <CatalogHero
            activeCategory={activeCategory}
            bannerUrl={branding.catalog_banner_url}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalCount={heroTotalCount}
          />
        </Reveal>

        <Reveal variant="fade-up" delay={60} eager className={styles.controlsStack}>
          <CategoryBar
            rootCategories={rootCategories}
            subCategories={subCategories}
            selectedCatId={selectedCatId}
            selectedSubCatId={selectedSubCatId}
            totalServicesCount={totalAvailable}
            onSelectRoot={handleSelectRoot}
            onSelectSub={setSelectedSubCatId}
          />

          <div className={styles.sortRow}>
            <button
              type="button"
              className={clsx(styles.sortBtn, sortBy === "recommended" && styles.sortActive)}
              onClick={() => setSortBy("recommended")}
            >
              <Star size={13} />
              <span>Рекомендуемые</span>
            </button>
            <button
              type="button"
              className={clsx(styles.sortBtn, sortBy === "newest" && styles.sortActive)}
              onClick={() => setSortBy("newest")}
            >
              <Clock size={13} />
              <span>Новинки</span>
            </button>
            <button
              type="button"
              className={clsx(styles.sortBtn, sortBy === "popularity" && styles.sortActive)}
              onClick={() => setSortBy("popularity")}
            >
              <Flame size={13} />
              <span>Популярные</span>
            </button>
            <button
              type="button"
              className={clsx(
                styles.sortBtn,
                (sortBy === "price_asc" || sortBy === "price_desc") && styles.sortActive
              )}
              onClick={() => setSortBy(sortBy === "price_asc" ? "price_desc" : "price_asc")}
            >
              <CircleDollarSign size={13} />
              <span>{sortBy === "price_desc" ? "Дороже" : "Дешевле"}</span>
              <ArrowUpDown size={12} />
            </button>
          </div>
        </Reveal>

        {isLoading ? (
          <div className={styles.productsGrid}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} height={330} rounded="xl" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <Reveal variant="fade-up" eager className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <PackageX size={28} />
            </div>
            <h3 className={styles.emptyTitle}>Товары не найдены</h3>
            <p className={styles.emptySubtitle}>
              {searchQuery
                ? "Попробуйте изменить поисковый запрос или сбросить фильтры категорий"
                : "В этой категории пока нет доступных предложений"}
            </p>
          </Reveal>
        ) : (
          <>
            <div className={styles.productsGrid}>
              {filteredServices.map((svc) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                >
                  <ServiceCard
                    service={svc}
                    categoryName={svc.catalog_id ? categoryMap.get(svc.catalog_id)?.name : null}
                    defaultCurrency={defaultCurrency}
                  />
                </motion.div>
              ))}
            </div>

            {hasNextPage && (
              <div ref={sentinelRef} className={styles.loadMoreSentinel}>
                {isFetchingNextPage && (
                  <div className={styles.loadingBatchPill}>
                    <Loader2 size={15} className={styles.spinIcon} />
                    <span>Загрузка товаров...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
