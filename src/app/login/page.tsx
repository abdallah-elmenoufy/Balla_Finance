import { redirect } from "next/navigation";
import { getPinHash, isAuthed } from "@/lib/auth";
import { login } from "@/app/actions/auth";
import PinForm from "@/components/PinForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!getPinHash()) redirect("/setup");
  if (await isAuthed()) redirect("/");
  return (
    <PinForm action={login} title="Balla Finance" subtitle="Enter your PIN to unlock" />
  );
}
