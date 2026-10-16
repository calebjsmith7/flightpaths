import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Inverse of the (app) gate: signed-in users have no business on the auth pages.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <GuestGate>{children}</GuestGate>
    </Suspense>
  );
}

async function GuestGate({ children }: { children: ReactNode }) {
  if (await getCurrentUser()) {
    redirect("/");
  }
  return children;
}
