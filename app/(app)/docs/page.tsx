import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function ApiDocsPage() {
  return (
    <Stack sx={{ gap: 3, maxWidth: 800 }}>
      <Typography component="h1" variant="h4">
        API docs
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Send a Google Routes API or Directions API response and get it back with a drone flight altitude assigned to
        every point. Full reference coming soon.
      </Typography>

      <section>
        <Typography component="h2" variant="h6" gutterBottom>
          Authentication
        </Typography>
        <Typography variant="body2">
          Pass an API key from your profile as <code>Authorization: Bearer &lt;key&gt;</code>.
        </Typography>
      </section>

      <section>
        <Typography component="h2" variant="h6" gutterBottom>
          POST /api/v1/routes
        </Typography>
        <Typography variant="body2">Request and response schema to follow.</Typography>
      </section>
    </Stack>
  );
}
