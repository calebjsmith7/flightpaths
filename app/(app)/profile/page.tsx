import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <Stack sx={{ gap: 3, maxWidth: 720 }}>
      <Typography component="h1" variant="h4">
        My profile
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Email
          </Typography>
          <Typography gutterBottom>{user.email ?? "—"}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            User ID
          </Typography>
          <Typography sx={{ fontFamily: "monospace" }}>{user.uid}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API keys
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Create keys to call the FlightPaths API from your own services. Coming soon.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
