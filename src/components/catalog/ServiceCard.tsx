import React, { useState, useEffect, useMemo } from "react";
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
  // Strict tag check: ONLY card tag applies to the card!
  const cardMedia = service.attachments?.find((a) => a.tag === "card") || null;

  // Ordered sequence of preview frames
  const previewFrames = useMemo(() => {
    if (!cardMedia) return [];
    if (cardMedia.previews && cardMedia.previews.length > 0) {
      return cardMedia.previews.map((p) => p.url);
    }
    if (cardMedia.thumb?.url) {
      return [cardMedia.thumb.url];
    }
    if (cardMedia.kind === "video") {
      return [`/api/media/${cardMedia.token}.thumb`];
    }
    if (cardMedia.url) {
      return [cardMedia.url];
    }
    return [];
  }, [cardMedia]);

  const defaultArtUrl = previewFrames[0] || service.image_url || null;
  const [isHovered, setIsHovered] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Smoothly cycle through preview frames on hover
  useEffect(() => {
    if (!isHovered || previewFrames.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setHoverIndex((prev) => ((prev ?? 0) + 1) % previewFrames.length);
    }, 750);

    return () => clearInterval(interval);
  }, [isHovered, previewFrames.length]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (previewFrames.length > 1) {
      setHoverIndex(0);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverIndex(null);
  };

  const currentArtUrl =
    hoverIndex !== null && previewFrames[hoverIndex]
      ? previewFrames[hoverIndex]
      : defaultArtUrl;

  const currency = service.currency || defaultCurrency;

  return (
    <Link
      to={`/catalog/${service.id}`}
      className={styles.card}
      data-reveal-item
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Artwork / Background Layer */}
      {currentArtUrl ? (
        <div
          className={styles.artwork}
          style={{ backgroundImage: `url(${currentArtUrl})` }}
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
