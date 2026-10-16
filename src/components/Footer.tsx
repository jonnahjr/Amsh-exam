"use client";

interface FooterProps {
  variant?: "default" | "compact" | "admin";
}

export function Footer({ variant: _variant = "default" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-compact" role="contentinfo">
      {/* Leveling Line */}
      <div className="footer-leveling-container">
        <div className="footer-leveling-line" />
      </div>

      <div className="footer-compact-content">
        <div className="footer-compact-dev">
          <span className="footer-dev-text">ICT Department</span>
        </div>

        <div className="footer-compact-meta">
          <span className="footer-meta-item">v2.4.0 (Enterprise)</span>
        </div>

        <div className="footer-compact-copy">
          © {currentYear} AMSH · All rights reserved.
        </div>
      </div>
    </footer>
  );
}
