import { getSessionUser } from "@/lib/auth";
import { NavBarClient } from "@/components/NavBarClient";

/**
 * Top navigation.
 *
 * Rendered on the server so the session is resolved before the first paint and
 * no loading flicker appears, then delegates to NavBarClient for responsive mobile interactions.
 */
export async function NavBar() {
  const user = await getSessionUser();
  return <NavBarClient user={user} />;
}
