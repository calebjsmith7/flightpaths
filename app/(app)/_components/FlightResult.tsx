'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import { MPS_PER_MPH } from '@/lib/routing/config';
import type { FlightPlan } from '@/lib/routing/types';

type Props = { input: string; demo: boolean; routeId: string; plan: FlightPlan };

export default function FlightResult({ input, demo, routeId, plan }: Props) {
  const minutes = (Date.parse(plan.arriveAt) - Date.parse(plan.departAt)) / 60_000;
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const stats = [
    {
      label: 'Altitude (AGL)',
      value:
        plan.minAltitudeAglFt === plan.maxAltitudeAglFt
          ? `${plan.minAltitudeAglFt} ft`
          : `${plan.minAltitudeAglFt}–${plan.maxAltitudeAglFt} ft`,
    },
    { label: 'Layer changes', value: String(plan.layerChanges) },
    { label: 'Cruise speed', value: `${Math.round(plan.cruiseSpeedMps / MPS_PER_MPH)} mph` },
    { label: 'Distance', value: `${(plan.distanceMeters / 1000).toFixed(2)} km` },
    { label: 'Flight time', value: `${minutes.toFixed(1)} min` },
    { label: 'Departs', value: time(plan.departAt) },
    { label: 'Arrives', value: time(plan.arriveAt) },
  ];

  // Same shape the API returns: the caller's JSON untouched, plus our block.
  const download = () => {
    const output = { ...JSON.parse(input), flightpaths: { routeId, ...plan } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `flightpath-${routeId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Flight planned</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {routeId}
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download}>
              Download JSON
            </Button>
          </Stack>

          {demo && (
            <Alert severity="info">
              Demo run: this route crosses permanent demo traffic flying east–west at 150 ft over I-35, so it climbs
              over it there. Demo runs are saved but don’t reserve airspace.
            </Alert>
          )}

          {plan.elevationSource === 'none' && (
            <Alert severity="warning">
              No terrain data was available, so ground level was treated as sea level. MSL altitudes won’t be accurate.
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
            }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {s.label}
                </Typography>
                <Typography variant="h6" component="p">
                  {s.value}
                </Typography>
              </div>
            ))}
          </Box>

          {plan.segments.length > 1 && (
            <div>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Layers along the route
              </Typography>
              {plan.segments.map((s) => (
                <Typography key={s.fromIndex} variant="body2">
                  {(s.startDistanceMeters / 1000).toFixed(2)}–{(s.endDistanceMeters / 1000).toFixed(2)} km at{' '}
                  {s.altitudeAglFt} ft
                </Typography>
              ))}
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
