import type { Metadata } from "next";
import Stack from "@mui/material/Stack";
import ColorModeSelect from "@/theme/ColorModeSelect";
import Content from "./_components/Content";
import SignInCard from "./_components/SignInCard";

export const metadata: Metadata = {
  title: "Sign in · FlightPaths",
};

const backdrop = {
  justifyContent: "center",
  minHeight: "100%",
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage: "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
  },
  '[data-mui-color-scheme="dark"] &::before': {
    backgroundImage: "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
  },
};

export default function SignInPage() {
  return (
    <>
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem" }} />
      <Stack direction="column" component="main" sx={backdrop}>
        <Stack
          direction={{ xs: "column-reverse", md: "row" }}
          sx={{ justifyContent: "center", gap: { xs: 6, sm: 12 }, p: { xs: 2, sm: 4 }, m: "auto" }}
        >
          <Content />
          <SignInCard />
        </Stack>
      </Stack>
    </>
  );
}
