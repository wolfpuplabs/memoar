import type { Metadata } from "next";
import CreateWizard from "./CreateWizard";
import { MAX_GUESTS_LIMIT } from "@/lib/events";
import { siteOrigin } from "@/lib/i18n-server";
import { isFirstEventOnDevice } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create event" };

export default async function CreatePage() {
  return <CreateWizard maxGuestsLimit={MAX_GUESTS_LIMIT} origin={await siteOrigin()} firstFree={await isFirstEventOnDevice()} />;
}
