import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import { getApiUsageToday, API_DAILY_LIMIT } from "@/lib/api-usage";
import { requireUser } from "@/lib/auth";
import CopyTokenButton from "./_components/CopyTokenButton";

export default async function ProfilePage() {
  const user = await requireUser();
  const used = await getApiUsageToday(user.uid);

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
          <Stack sx={{ gap: 2 }}>
            <div>
              <Typography variant="h6" gutterBottom>
                API access
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Call the FlightPaths API with a token as{" "}
                <Box component="code" sx={{ fontFamily: "monospace" }}>
                  Authorization: Bearer &lt;token&gt;
                </Box>
                . Tokens last an hour. See the <Link href="/docs">API docs</Link> for details.
              </Typography>
            </div>
            <div>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Requests today (resets at midnight UTC)
              </Typography>
              <Typography variant="h6" component="p">
                {used} / {API_DAILY_LIMIT}
              </Typography>
            </div>
            <CopyTokenButton />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
