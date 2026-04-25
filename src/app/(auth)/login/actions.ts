"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateWithPassword } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1)
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/login?error=Enter%20your%20username%20or%20email%20and%20password.");
  }

  const result = await authenticateWithPassword(parsed.data.identifier, parsed.data.password);

  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.reason)}`);
  }

  redirect("/");
}
