import React, { useState, useEffect, useRef } from "react"
import { NavLink, Link } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { useAuth } from "@/hooks/use-auth"
import { useBranding } from "@/hooks/use-branding"
import { Logo } from "@/components/ui/Logo/Logo"
import { formatCurrency } from "@/lib/format"
import {
  ShoppingBag,
  User,
  Plus,
  LogOut,
  LogIn,
  Menu,
  X,
  Wallet,
  Sparkles,
  Tag,
} from "lucide-react"
import clsx from "clsx"
import styles from "./Header.module.scss"

export interface HeaderProps {
  onOpenTopUp: () => void
  onOpenPromo: () => void
}

const NAV_LINKS = [
  { to: "/catalog", label: "Каталог", icon: <ShoppingBag size={16} /> },
  { to: "/profile", label: "Профиль", icon: <User size={16} />, authOnly: true },
]

export const Header: React.FC<HeaderProps> = ({ onOpenTopUp, onOpenPromo }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const { branding } = useBranding()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const balance = Number(user?.balance ?? 0)
  const bonusBalance = Number(user?.bonus_balance ?? 0)
  const currency = branding.currency || "RUB"

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Lock scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  const handleLogout = async () => {
    setDropdownOpen(false)
    setMenuOpen(false)
    await logout()
  }

  const visibleLinks = NAV_LINKS.filter((l) => !l.authOnly || isAuthenticated)

  return (
    <>
      <div className={styles.headerWrap}>
        <header className={styles.header}>
          <div className={styles.container}>
          {/* Brand */}
          <Link to="/catalog" className={styles.brand} onClick={() => setMenuOpen(false)}>
            <Logo src={branding.logo_url} size={30} className={styles.logo} />
            <span className={styles.brandName}>{branding.name}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className={styles.nav} aria-label="Основная навигация">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  clsx(styles.navLink, isActive && styles.navLinkActive)
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className={styles.right}>
            {isAuthenticated && user ? (
              <>
                {/* Balance + Bonus + TopUp */}
                <div
                  className={styles.balanceChip}
                  title={
                    bonusBalance > 0
                      ? `Баланс: ${formatCurrency(balance, currency)} · Бонусы: ${formatCurrency(bonusBalance, currency)}`
                      : `Баланс: ${formatCurrency(balance, currency)}`
                  }
                >
                  <Wallet size={14} className={styles.walletIcon} />
                  <span className={styles.balanceAmt}>
                    {formatCurrency(balance, currency)}
                  </span>
                  {bonusBalance > 0 && (
                    <span className={styles.bonusAmt}>
                      <Sparkles size={11} />
                      +{bonusBalance.toFixed(0)} бон.
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.plusBtn}
                    onClick={onOpenTopUp}
                    title="Пополнить баланс"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Avatar Dropdown */}
                <div className={styles.avatarWrap} ref={dropdownRef}>
                  <button
                    type="button"
                    className={styles.avatarBtn}
                    onClick={() => setDropdownOpen((v) => !v)}
                    aria-label="Меню профиля"
                    aria-expanded={dropdownOpen}
                  >
                    <div className={styles.avatar}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.login} className={styles.avatarImg} />
                      ) : (
                        <span className={styles.avatarInitials}>
                          {user.login?.slice(0, 2).toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <span className={styles.avatarLogin}>{user.login}</span>
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        className={styles.dropdown}
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Link
                          to="/profile"
                          className={styles.dropdownItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User size={15} />
                          <span>Мой профиль</span>
                        </Link>
                        <button
                          type="button"
                          className={clsx(styles.dropdownItem, styles.dropdownItemDanger)}
                          onClick={handleLogout}
                        >
                          <LogOut size={15} />
                          <span>Выйти</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link to="/login" className={styles.loginBtn}>
                <LogIn size={15} />
                <span>Войти</span>
              </Link>
            )}

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              className={styles.hamburger}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
          </div>
        </header>
      </div>

      {/* Mobile Full-Screen Overlay Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.mobileOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Mobile Overlay Top Bar */}
            <div className={styles.mobileTopBar}>
              <Link to="/catalog" className={styles.brand} onClick={() => setMenuOpen(false)}>
                <Logo src={branding.logo_url} size={28} className={styles.logo} />
                <span className={styles.brandName}>{branding.name}</span>
              </Link>
              <button
                type="button"
                className={styles.hamburger}
                onClick={() => setMenuOpen(false)}
                aria-label="Закрыть меню"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className={styles.mobileNav}>
              {visibleLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      clsx(styles.mobileNavLink, isActive && styles.mobileNavLinkActive)
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </NavLink>
                </motion.div>
              ))}

              {/* Auth actions in mobile menu */}
              {isAuthenticated ? (
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, delay: visibleLinks.length * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={styles.mobileActions}
                >
                  <button type="button" className={styles.mobileActionBtn} onClick={() => { setMenuOpen(false); onOpenTopUp() }}>
                    <Plus size={16} />
                    <span>Пополнить баланс</span>
                  </button>
                  <button type="button" className={styles.mobileActionBtn} onClick={() => { setMenuOpen(false); onOpenPromo() }}>
                    <Tag size={16} />
                    <span>Промокод</span>
                  </button>
                  <button type="button" className={clsx(styles.mobileActionBtn, styles.mobileLogout)} onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Выйти</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, delay: visibleLinks.length * 0.06 }}
                >
                  <Link to="/login" className={styles.mobileLoginBtn} onClick={() => setMenuOpen(false)}>
                    <LogIn size={16} />
                    <span>Войти в аккаунт</span>
                  </Link>
                </motion.div>
              )}
            </nav>

            {/* Bottom brand strip */}
            <div className={styles.mobileFooter}>
              <span>{branding.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
