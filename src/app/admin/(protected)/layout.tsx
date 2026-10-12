"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

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
    <aside
      style={{
        width: collapsed ? 64 : 230,
        minWidth: collapsed ? 64 : 230,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: collapsed ? "18px 16px" : "18px 20px",
          borderBottom: "1px solid var(--border)",
          minHeight: 68,
        }}
      >
        <Image
          src="/amsh-logo.jpg"
          alt="AMSH"
          width={32}
          height={32}
          style={{ borderRadius: 8, flexShrink: 0 }}
          priority
        />
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", whiteSpace: "nowrap" }}>
              AMSH Admin
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
              Control Center
            </div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8,
                marginBottom: 2,
                fontWeight: active ? 600 : 400,
                fontSize: "0.9rem",
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "rgba(37, 99, 235, 0.08)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{link.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer links */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <Link
          href="/"
          title={collapsed ? "Employee Portal" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <span>←</span>
          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Employee Portal</span>}
        </Link>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "var(--text-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span>{collapsed ? "»" : "«"}</span>
          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ flex: 1, padding: "32px 36px", maxWidth: 1280, width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
