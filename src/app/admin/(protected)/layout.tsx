"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Footer } from "@/components/Footer";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function AdminSidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // Auto close mobile drawer on route change
  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  const links = [
    { href: "/admin", label: "Dashboard", icon: "⊞" },
    { href: "/admin/checkins", label: "Check-In Queue", icon: "✓" },
    { href: "/questions", label: "Question Bank", icon: "✎" },
    { href: "/exams", label: "Exams", icon: "📄" },
    { href: "/admin/bulk-exam", label: "Bulk Add Exam", icon: "+" },
    { href: "/admin/import", label: "Import Questions", icon: "↑" },
    { href: "/admin/audit", label: "Audit Log", icon: "☰" },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`admin-sidebar ${collapsed ? "admin-sidebar-collapsed" : ""} ${mobileOpen ? "admin-sidebar-mobile-open" : ""}`}
      >
        {/* Logo & Mobile Close */}
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-sidebar-brand" onClick={onCloseMobile}>
            <Image
              src="/amsh-logo.jpg"
              alt="AMSH"
              width={32}
              height={32}
              style={{ borderRadius: 8, flexShrink: 0 }}
              priority
            />
            {(!collapsed || mobileOpen) && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", whiteSpace: "nowrap" }}>
                  AMSH Admin
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                  Control Center
                </div>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm admin-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="admin-sidebar-nav">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed && !mobileOpen ? link.label : undefined}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={onCloseMobile}
              >
                <span className="admin-nav-icon">{link.icon}</span>
                {(!collapsed || mobileOpen) && <span style={{ whiteSpace: "nowrap" }}>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer links */}
        <div className="admin-sidebar-footer">
          <Link
            href="/"
            title={collapsed && !mobileOpen ? "Employee Portal" : undefined}
            className="admin-nav-item"
            onClick={onCloseMobile}
          >
            <span className="admin-nav-icon">←</span>
            {(!collapsed || mobileOpen) && <span style={{ whiteSpace: "nowrap" }}>Employee Portal</span>}
          </Link>
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="admin-collapse-btn desktop-only"
          >
            <span>{collapsed ? "»" : "«"}</span>
            {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout-root">
      {/* Mobile Top Header */}
      <header className="admin-mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image
            src="/amsh-logo.jpg"
            alt="AMSH"
            width={28}
            height={28}
            style={{ borderRadius: 6, flexShrink: 0 }}
            priority
          />
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
            AMSH Admin
          </div>
        </div>

        <button
          type="button"
          className="admin-mobile-menu-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin navigation menu"
        >
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>☰</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Menu</span>
        </button>
      </header>

      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="admin-content-wrap">
        <main className="admin-main">
          {children}
        </main>
        <Footer variant="admin" />
      </div>
    </div>
  );
}
