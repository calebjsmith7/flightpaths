import AppBar from "@mui/material/AppBar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ColorModeIconDropdown from "@/theme/ColorModeIconDropdown";
import SignOutButton from "./SignOutButton";

export default function AppHeader({ email }: { email: string | null }) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          FlightPaths
        </Typography>
        <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}>
            {email}
          </Typography>
          <ColorModeIconDropdown />
          <SignOutButton />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
