import { NavBar } from "@/components/NavBar";

// Every page here renders a session-dependent navigation bar, so nothing in
// this segment may be prerendered at build time.
export const dynamic = "force-dynamic";

/** Standard application chrome: the sticky top navigation plus page content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="page">{children}</main>
    </>
  );
}
