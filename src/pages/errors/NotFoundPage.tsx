import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBranding } from "@/hooks/use-branding";
import { Button } from "@/components/ui/Button/Button";
import { MaskText, Reveal } from "@/components/motion";
import { ArrowLeft } from "lucide-react";
import styles from "./NotFoundPage.module.scss";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [imgError, setImgError] = useState(false);

  const mascotSrc = branding.mascot_not_found_url || "/unvi/mascot/NotFoundMascotUNVI.webp";

  return (
    <div className={styles.page}>
      <Reveal variant="fade-blur" eager className={styles.container}>
        {!imgError && (
          <div className={styles.mascotWrap}>
            <img
              key={mascotSrc}
              src={mascotSrc}
              alt="Страница не найдена"
              className={styles.mascot}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <div className={styles.code}>
          <MaskText direction="up" duration={600}>
            404
          </MaskText>
        </div>

        <h1 className={styles.title}>Страница не найдена</h1>
        <p className={styles.subtitle}>
          Похоже, вы перешли по устаревшей ссылке или такой страницы не существует.
        </p>

        <Button
          variant="gradient"
          size="lg"
          icon={<ArrowLeft size={17} />}
          onClick={() => navigate("/profile")}
        >
          Вернуться в профиль
        </Button>
      </Reveal>
    </div>
  );
};
