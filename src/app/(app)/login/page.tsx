import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/checkin");
  return null;
}
