import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { SessionWatcher } from "@/components/SessionWatcher";

// Every page here renders a session-dependent navigation bar, so nothing in
// this segment may be prerendered at build time.
export const dynamic = "force-dynamic";

/** Standard application chrome: the sticky top navigation, page content, and enterprise footer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <SessionWatcher />
      <NavBar />
      <main className="page">{children}</main>
      <Footer />
    </div>
  );
}

