"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import type { SessionUser } from "@/lib/auth";

interface NavBarClientProps {
  user: SessionUser | null;
}

export function NavBarClient({ user }: NavBarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isStaff = user?.role === "INSTRUCTOR" || user?.role === "ADMINISTRATOR";

  // Auto-close mobile menu when changing route
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) => {
    if (href === "/exams" && pathname === "/exams") return true;
    if (href === "/results" && (pathname === "/results" || pathname.startsWith("/results/"))) return true;
    if (href === "/questions" && pathname.startsWith("/questions")) return true;
    if (href.startsWith("/admin") && pathname === href) return true;
    return pathname === href;
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={isStaff ? "/admin" : "/exams"} className="brand" onClick={() => setMobileMenuOpen(false)}>
          <Image
            src="/amsh-logo.jpg"
            alt="AMSH"
            width={28}
            height={28}
            className="brand-logo-img"
            priority
          />
          <span>MOCK EXAM</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="nav-links desktop-nav">
          {user && (
            <>
              <Link href="/exams" className={isActive("/exams") ? "active" : ""}>Exams</Link>
              {isStaff && <Link href="/questions" className={isActive("/questions") ? "active" : ""}>Question Bank</Link>}
              <Link href="/results" className={isActive("/results") ? "active" : ""}>Results</Link>
              {isStaff && <Link href="/admin/checkins" className={isActive("/admin/checkins") ? "active" : ""}>Check-Ins</Link>}
              {isStaff && <Link href="/admin/bulk-exam" className={isActive("/admin/bulk-exam") ? "active" : ""}>Bulk Add Exam</Link>}
              {isStaff && <Link href="/admin/import" className={isActive("/admin/import") ? "active" : ""}>Import</Link>}
              {user.role === "ADMINISTRATOR" && <Link href="/admin/audit" className={isActive("/admin/audit") ? "active" : ""}>Audit Log</Link>}
            </>
          )}
        </nav>

        {/* Desktop User Info & Logout */}
        <div className="nav-right desktop-nav">
          {user ? (
            <>
              <span className="user-label">
                <span className="user-name">{user.name ?? user.email}</span>{" "}
                <span className="badge badge-accent">{user.role}</span>
              </span>
              <LogoutButton />
            </>
          ) : null}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="mobile-nav-toggle-wrap">
          {user && (
            <span className="badge badge-accent mobile-user-badge" style={{ marginRight: 6 }}>
              {user.role}
            </span>
          )}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-icon ${mobileMenuOpen ? "open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="brand">
                <Image
                  src="/amsh-logo.jpg"
                  alt="AMSH"
                  width={24}
                  height={24}
                  className="brand-logo-img"
                />
                <span>AMSH Navigation</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm mobile-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {user && (
              <div className="mobile-user-card">
                <div className="mobile-user-name">{user.name ?? user.email}</div>
                <div className="mobile-user-role">
                  <span className="badge badge-accent">{user.role}</span>
                  {user.email && <span className="mobile-user-email">{user.email}</span>}
                </div>
              </div>
            )}

            <nav className="mobile-nav-list">
              {user ? (
                <>
                  <Link
                    href="/exams"
                    className={`mobile-nav-link ${isActive("/exams") ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mobile-nav-icon">📄</span>
                    <span>Exams</span>
                  </Link>

                  {isStaff && (
                    <Link
                      href="/questions"
                      className={`mobile-nav-link ${isActive("/questions") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">✎</span>
                      <span>Question Bank</span>
                    </Link>
                  )}

                  <Link
                    href="/results"
                    className={`mobile-nav-link ${isActive("/results") ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mobile-nav-icon">📊</span>
                    <span>Results</span>
                  </Link>

                  {isStaff && (
                    <Link
                      href="/admin/checkins"
                      className={`mobile-nav-link ${isActive("/admin/checkins") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">✓</span>
                      <span>Check-In Queue</span>
                    </Link>
                  )}

                  {isStaff && (
                    <Link
                      href="/admin/bulk-exam"
                      className={`mobile-nav-link ${isActive("/admin/bulk-exam") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">+</span>
                      <span>Bulk Add Exam</span>
                    </Link>
                  )}

                  {isStaff && (
                    <Link
                      href="/admin/import"
                      className={`mobile-nav-link ${isActive("/admin/import") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">↑</span>
                      <span>Import Questions</span>
                    </Link>
                  )}

                  {user.role === "ADMINISTRATOR" && (
                    <Link
                      href="/admin/audit"
                      className={`mobile-nav-link ${isActive("/admin/audit") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">☰</span>
                      <span>Audit Log</span>
                    </Link>
                  )}

                  {isStaff && (
                    <Link
                      href="/admin"
                      className={`mobile-nav-link ${isActive("/admin") ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">⚙</span>
                      <span>Admin Control Center</span>
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mobile-nav-icon">→</span>
                  <span>Sign In</span>
                </Link>
              )}
            </nav>

            {user && (
              <div className="mobile-menu-footer">
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
