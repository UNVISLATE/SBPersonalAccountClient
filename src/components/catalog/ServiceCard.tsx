import React from "react";
import { Link } from "react-router-dom";
import type { CatalogService } from "@/api/types";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge/Badge";
import { ChevronRight, Flame } from "lucide-react";
import styles from "./ServiceCard.module.scss";

export interface ServiceCardProps {
  service: CatalogService;
  categoryName?: string | null;
  defaultCurrency: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  categoryName,
  defaultCurrency,
}) => {
  const cardMedia =
    service.attachments?.find((a) => a.tag === "card") ||
    service.attachments?.find((a) => a.tag === "banner") ||
    service.attachments?.find((a) => a.kind === "image") ||
    service.attachments?.[0];

  const artworkUrl = cardMedia?.url || service.image_url || null;
  const currency = service.currency || defaultCurrency;

  return (
    <Link to={`/catalog/${service.id}`} className={styles.card} data-reveal-item>
      {/* Artwork / Background Layer */}
      {artworkUrl ? (
        <div
          className={styles.artwork}
          style={{ backgroundImage: `url(${artworkUrl})` }}
          aria-hidden="true"
        />
      ) : (
        <div className={styles.fallbackArt} aria-hidden="true">
          <div className={styles.fallbackGrid} />
          <span className={styles.fallbackInitials}>
            {service.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      <div className={styles.scrim} aria-hidden="true" />

      {/* Top Row: Status + Optional HOT badge */}
      <div className={styles.topRow}>
        {service.out_of_stock ? (
          <Badge variant="muted" size="sm" dot>
            Нет в наличии
          </Badge>
        ) : (
          <Badge variant="success" size="sm" dot>
            Работает
          </Badge>
        )}

        {service.is_recommended && (
          <Badge variant="accent" size="sm">
            <Flame size={11} style={{ marginRight: 3, display: "inline" }} />
            HOT
          </Badge>
        )}
      </div>

      {/* Bottom Frosted Glass Info Plate */}
      <div className={styles.bottomPlate}>
        {categoryName && <span className={styles.catLabel}>{categoryName}</span>}
        <h3 className={styles.title}>{service.name}</h3>

        <div className={styles.footerRow}>
          <div className={styles.priceWrap}>
            {service.price_type === "tiered" && (
              <span className={styles.pricePrefix}>от</span>
            )}
            <span className={styles.priceVal}>
              {formatCurrency(service.price, currency)}
            </span>
          </div>

          <span className={styles.ctaChip}>
            <span>Перейти</span>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
};
