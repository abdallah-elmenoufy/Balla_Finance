import { redirect } from "next/navigation";
import { getPinHash } from "@/lib/auth";
import { setupPin } from "@/app/actions/auth";
import PinForm from "@/components/PinForm";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (getPinHash()) redirect("/login");
  return (
    <PinForm
      action={setupPin}
      title="Welcome 👋"
      subtitle="Set a PIN to protect your finances"
      confirmField
    />
  );
}
