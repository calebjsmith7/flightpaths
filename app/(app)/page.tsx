import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadCard from "./_components/UploadCard";

export default function Home() {
  return (
    <Stack sx={{ gap: 3, maxWidth: 1600 }}>
      <Typography component="h1" variant="h4">
        Home
      </Typography>
      <UploadCard />
    </Stack>
  );
}
