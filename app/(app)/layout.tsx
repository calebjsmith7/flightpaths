import { Suspense, type ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { requireUser } from "@/lib/auth";
import AppHeader from "./_components/AppHeader";

export default function AppLayout({ children }: LayoutProps<"/">) {
  // The session is read at request time, so it has to sit behind Suspense
  // (Cache Components). Nothing below renders until the user is verified.
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}

async function AuthGate({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppHeader email={user.email} />
      <Box component="main" sx={{ p: { xs: 2, sm: 4 } }}>
        {children}
      </Box>
    </>
  );
}

function FullPageSpinner() {
  return (
    <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
}
