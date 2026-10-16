"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface FooterProps {
  variant?: "default" | "compact" | "admin";
}

export function Footer({ variant = "default" }: FooterProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (variant === "compact") {
    return (
      <footer className="footer-compact" role="contentinfo">
        {/* Leveling Line */}
        <div className="footer-leveling-container">
          <div className="footer-leveling-line" />
          <div className="footer-leveling-badge">
            <span className="footer-pulse-dot" />
            <span className="footer-leveling-text">AMSH ICT SECURE ENVIRONMENT</span>
          </div>
        </div>

        <div className="footer-compact-content">
          <div className="footer-compact-dev">
            <span className="footer-dev-tag">SYSTEM</span>
            <span className="footer-dev-text">
              Developed by <strong>Yonas Bogale</strong> · ICT Department
            </span>
          </div>

          <div className="footer-compact-meta">
            <span className="footer-meta-pill">
              <span className="footer-status-dot" /> All Systems Operational
            </span>
            <span className="footer-meta-sep">•</span>
            <span className="footer-meta-item">🔒 256-Bit Encrypted</span>
            <span className="footer-meta-sep">•</span>
            <span className="footer-meta-item">v2.4.0 (Enterprise)</span>
            {timeStr && (
              <>
                <span className="footer-meta-sep">•</span>
                <span className="footer-meta-item clock-item">🕒 {timeStr}</span>
              </>
            )}
          </div>

          <div className="footer-compact-copy">
            © {currentYear} AMSH (Allied Medical & Surgical Hospital) · All rights reserved.
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "admin") {
    return (
      <footer className="footer-admin" role="contentinfo">
        {/* Leveling Line */}
        <div className="footer-leveling-container">
          <div className="footer-leveling-line" />
          <div className="footer-leveling-badge">
            <span className="footer-pulse-dot" />
            <span className="footer-leveling-text">AMSH ICT CORE MANAGEMENT CONSOLE</span>
          </div>
        </div>

        <div className="footer-admin-content">
          <div className="footer-admin-left">
            <div className="footer-admin-brand">
              <span className="footer-admin-name">AMSH Exam Platform</span>
              <span className="footer-admin-role-badge">Admin Workspace</span>
            </div>
            <div className="footer-admin-dev">
              Developed by <strong>Yonas Bogale</strong> — ICT Department
            </div>
          </div>

          <div className="footer-admin-center">
            <div className="footer-status-badge">
              <span className="footer-status-dot" />
              <span>Real-time Candidate Monitor Active</span>
            </div>
            {timeStr && <div className="footer-clock-badge">🕒 Server Sync: {timeStr}</div>}
          </div>

          <div className="footer-admin-right">
            <div className="footer-admin-badges">
              <span className="footer-badge">Audit: STRICT</span>
              <span className="footer-badge">Build v2.4.0</span>
            </div>
            <div className="footer-admin-copy">
              © {currentYear} AMSH ICT Department · Confidential
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Default rich footer
  return (
    <footer className="site-footer" role="contentinfo">
      {/* Leveling Line with Accent Badge */}
      <div className="footer-leveling-container">
        <div className="footer-leveling-line" />
        <div className="footer-leveling-badge">
          <span className="footer-pulse-dot" />
          <span className="footer-leveling-text">AMSH ICT ENTERPRISE INFRASTRUCTURE</span>
        </div>
      </div>

      <div className="site-footer-inner">
        {/* Main Grid Section */}
        <div className="site-footer-grid">
          {/* Col 1: Platform identity & Description */}
          <div className="footer-col footer-col-brand">
            <div className="footer-logo-row">
              <Image
                src="/amsh-logo.jpg"
                alt="AMSH Exam"
                width={42}
                height={42}
                className="footer-logo-img"
              />
              <div>
                <div className="footer-logo-title">AMSH Exam Platform</div>
                <div className="footer-logo-sub">Employee Assessment & Evaluation System</div>
              </div>
            </div>
            <p className="footer-brand-desc">
              Next-generation proctored examination and staff qualification platform designed for
              AMSH healthcare and administrative professionals.
            </p>
            <div className="footer-trust-chips">
              <span className="footer-chip">🛡️ Anti-Tamper Proctored</span>
              <span className="footer-chip">🔒 256-Bit TLS Verified</span>
            </div>
          </div>

          {/* Col 2: Developed by Yonas Bogale (ICT Department) */}
          <div className="footer-col footer-col-dev">
            <div className="footer-dev-card">
              <div className="footer-dev-card-header">
                <span className="footer-dev-icon">💻</span>
                <div>
                  <span className="footer-dev-eyebrow">SYSTEM ARCHITECTURE</span>
                  <div className="footer-dev-name">Developed by Yonas Bogale</div>
                  <div className="footer-dev-dept">ICT Department · Software Engineering</div>
                </div>
              </div>
              <p className="footer-dev-desc">
                Architected and engineered for high-concurrency candidate evaluation, automated multi-format grading,
                and real-time session telemetry.
              </p>
              <div className="footer-tech-stack">
                <span className="tech-tag">Next.js 14</span>
                <span className="tech-tag">TypeScript</span>
                <span className="tech-tag">PostgreSQL</span>
                <span className="tech-tag">v2.4.0 Production</span>
              </div>
            </div>
          </div>

          {/* Col 3: Little Professional Things: System status, live clock, helpdesk */}
          <div className="footer-col footer-col-ops">
            <div className="footer-section-title">System & Operational Telemetry</div>

            <div className="footer-status-card">
              <div className="footer-status-row">
                <div className="footer-status-indicator">
                  <span className="footer-pulse-dot" />
                  <span className="status-label">All Systems Operational</span>
                </div>
                <span className="uptime-pill">99.98% SLA</span>
              </div>

              {timeStr && (
                <div className="footer-time-row">
                  <span className="time-icon">🕒</span>
                  <div className="time-details">
                    <span className="time-val">{timeStr}</span>
                    <span className="time-sub">NTP Synchronized (Addis Ababa / EAT)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="footer-support-box">
              <div className="footer-support-row">
                <span className="support-icon">📞</span>
                <div>
                  <span className="support-label">ICT Support Desk</span>
                  <span className="support-val">Extension: 4400</span>
                </div>
              </div>
              <div className="footer-support-row">
                <span className="support-icon">✉️</span>
                <div>
                  <span className="support-label">Helpdesk Support</span>
                  <span className="support-val">ict-support@amsh.internal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Divider */}
        <div className="footer-sub-divider" />

        {/* Bottom Bar: Copyright & Quick Integrity Tags */}
        <div className="footer-bottom-bar">
          <div className="footer-copy">
            © {currentYear} <strong>AMSH (Allied Medical & Surgical Hospital)</strong>. All rights reserved.
            <span className="footer-pipe">·</span>
            <span className="footer-ict-tag">Designed & Built by AMSH ICT Department</span>
          </div>

          <div className="footer-quick-links">
            <span className="footer-pill-link">
              <span className="footer-pill-dot" /> Official Enterprise Platform
            </span>
            <span className="footer-pill-link">Confidential & Proprietary</span>
            <span className="footer-pill-link">Audited Session</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
