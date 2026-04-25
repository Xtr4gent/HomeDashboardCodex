"use server";

import { redirect } from "next/navigation";
import { logoutCurrentSession } from "@/lib/auth";

export async function logoutAction() {
  await logoutCurrentSession();
  redirect("/login");
}
