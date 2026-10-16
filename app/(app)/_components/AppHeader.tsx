import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { signOut } from "@/lib/actions";
import ColorModeIconDropdown from "@/theme/ColorModeIconDropdown";

export default function AppHeader({ email }: { email: string }) {
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
          <form action={signOut}>
            <Button type="submit" variant="outlined" size="small">
              Sign out
            </Button>
          </form>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
