'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFileRounded';
import { planDemoRoute, planRoute, type PlanRouteResult } from '@/lib/route-actions';
import { DEFAULT_CRUISE_SPEED_MPS, MPS_PER_MPH } from '@/lib/routing/config';
import FlightResult from './FlightResult';
import VisualizerCard from './VisualizerCard';
import { SAMPLE_ROUTE } from '@/lib/demo-routes';

const DEFAULT_SPEED_MPH = Math.round(DEFAULT_CRUISE_SPEED_MPS / MPS_PER_MPH);
const MAX_SPEED_MPH = 100;

export default function UploadCard() {
  const [file, setFile] = React.useState<{ name: string; text: string } | null>(null);
  const [departure, setDeparture] = React.useState('');
  const [speedMph, setSpeedMph] = React.useState(String(DEFAULT_SPEED_MPH));
  const [dragging, setDragging] = React.useState(false);
  const [result, setResult] = React.useState<{ input: string; demo: boolean; outcome: PlanRouteResult } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const speedValid = Number(speedMph) >= 1 && Number(speedMph) <= MAX_SPEED_MPH;

  const loadFile = async (picked: File | undefined) => {
    if (picked) {
      setFile({ name: picked.name, text: await picked.text() });
    }
  };

  const run = (demo: boolean) => {
    const input = demo ? JSON.stringify(SAMPLE_ROUTE) : (file?.text ?? '');
    // datetime-local has no zone; Date reads it as the browser's local time.
    const departureTime = departure ? new Date(departure).toISOString() : undefined;
    const options = { departureTime, cruiseSpeedMps: Number(speedMph) * MPS_PER_MPH };
    startTransition(async () => {
      const outcome = demo ? await planDemoRoute(options) : await planRoute(input, options);
      setResult({ input, demo, outcome });
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    run(false);
  };

  const planned = result?.outcome.ok
    ? { input: result.input, demo: result.demo, routeId: result.outcome.routeId, plan: result.outcome.plan }
    : null;

  // Two columns on wide screens (planner and visualizer left, Flight Plan
  // right); one column otherwise, with the Flight Plan between the two.
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(320px, 1fr)' },
        gridTemplateAreas: { xs: '"planner" "plan" "viz"', lg: '"planner plan" "viz plan"' },
        gridTemplateRows: { lg: 'auto 1fr' },
        alignItems: 'start',
      }}
    >
      <Stack sx={{ gridArea: 'planner', gap: 3 }}>
        <Card variant="outlined">
          <CardContent component="form" onSubmit={submit}>
            <Stack sx={{ gap: 2 }}>
              <div>
                <Typography variant="h6">Plan a flight</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Upload a Google Routes API or Directions API response as a .json file. We’ll assign a drone altitude
                  to every point along it.
                </Typography>
              </div>

              <Stack
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  loadFile(e.dataTransfer.files[0]);
                }}
                sx={{
                  gap: 1,
                  p: 3,
                  alignItems: 'center',
                  border: '2px dashed',
                  borderColor: dragging ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: dragging ? 'action.hover' : undefined,
                }}
              >
                <UploadFileIcon color="action" />
                {file ? (
                  <Chip label={file.name} onDelete={() => setFile(null)} />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Drop a .json file here, or
                  </Typography>
                )}
                <Stack direction="row" sx={{ gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => fileInput.current?.click()}>
                    {file ? 'Choose another' : 'Choose file'}
                  </Button>
                  <Button size="small" disabled={pending || !speedValid} onClick={() => run(true)}>
                    Run the demo
                  </Button>
                </Stack>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    loadFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
                <TextField
                  label="Departure"
                  type="datetime-local"
                  size="small"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  helperText="Leave blank to depart now"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Cruise speed"
                  type="number"
                  size="small"
                  value={speedMph}
                  onChange={(e) => setSpeedMph(e.target.value)}
                  error={!speedValid}
                  helperText={speedValid ? 'Up to 100 mph' : 'Enter 1–100 mph'}
                  slotProps={{
                    htmlInput: { min: 1, max: MAX_SPEED_MPH, step: 1 },
                    input: { endAdornment: <InputAdornment position="end">mph</InputAdornment> },
                  }}
                  sx={{ width: { sm: 160 } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  loading={pending}
                  disabled={!file || !speedValid}
                  sx={{ ml: { sm: 'auto' } }}
                >
                  Plan flight
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {result && !result.outcome.ok && <Alert severity="error">{result.outcome.error}</Alert>}
      </Stack>

      <Box sx={{ gridArea: 'plan', position: { lg: 'sticky' }, top: { lg: 16 } }}>
        <FlightResult planned={planned} />
      </Box>

      <Box sx={{ gridArea: 'viz', minWidth: 0 }}>
        <VisualizerCard routeId={planned?.routeId ?? null} />
      </Box>
    </Box>
  );
}
