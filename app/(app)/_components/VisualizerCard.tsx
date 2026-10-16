'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ViewInArIcon from '@mui/icons-material/ViewInArRounded';
import { getRouteScene, type RouteSceneResult } from '@/lib/route-actions';

// deck.gl and MapLibre only download once there's a route to show.
const FlightMap = dynamic(() => import('./FlightMap'), {
  ssr: false,
  loading: () => <Centered><CircularProgress /></Centered>,
});

const CYAN = 'rgb(0, 240, 255)';
const MAGENTA = 'rgb(255, 43, 214)';
const AMBER = 'rgb(255, 184, 0)';

// Lines are the flight paths; boxes are the layer slabs stacked in shared cells.
const LEGEND = [
  { label: 'Your route', color: CYAN, shape: 'line' },
  { label: 'Conflicting traffic', color: MAGENTA, shape: 'line' },
  { label: 'Your layer', color: CYAN, shape: 'box' },
  { label: 'Traffic layer', color: MAGENTA, shape: 'box' },
  { label: 'Free layer', color: AMBER, shape: 'outline' },
] as const;

export default function VisualizerCard({ routeId }: { routeId: string | null }) {
  const [result, setResult] = React.useState<{ routeId: string; outcome: RouteSceneResult } | null>(null);
  const [exaggeration, setExaggeration] = React.useState(8);

  React.useEffect(() => {
    if (!routeId) {
      return;
    }
    let cancelled = false;
    getRouteScene(routeId).then((outcome) => {
      if (!cancelled) setResult({ routeId, outcome });
    });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const current = result && result.routeId === routeId ? result.outcome : null;
  const trafficCount = current?.ok ? current.scene.paths.filter((p) => p.kind === 'traffic').length : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack sx={{ gap: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Flight visualizer</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {current?.ok
                  ? trafficCount
                    ? `Your route and ${trafficCount} conflicting ${trafficCount === 1 ? 'route' : 'routes'}. Drag to pan; right-drag or Ctrl-drag to tilt and rotate.`
                    : 'No conflicting traffic on this route. Drag to pan; right-drag or Ctrl-drag to tilt and rotate.'
                  : 'Altitude along your route, in 3D.'}
              </Typography>
            </Box>
            {current?.ok && (
              <Box sx={{ width: { sm: 220 } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Height exaggeration: {exaggeration}×
                </Typography>
                <Slider
                  size="small"
                  min={1}
                  max={20}
                  value={exaggeration}
                  onChange={(_, v) => setExaggeration(v as number)}
                  aria-label="Height exaggeration"
                />
              </Box>
            )}
          </Stack>

          <Box
            sx={{
              position: 'relative',
              height: { xs: 360, sm: 480 },
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: '#0b0f14',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {!routeId ? (
              <Centered>
                <ViewInArIcon sx={{ color: 'grey.600', fontSize: 40 }} />
                <Typography sx={{ color: 'grey.500' }}>Plan a trip to see the visualizer.</Typography>
              </Centered>
            ) : !current ? (
              <Centered>
                <CircularProgress />
              </Centered>
            ) : !current.ok ? (
              <Centered>
                <Alert severity="error">{current.error}</Alert>
              </Centered>
            ) : (
              <FlightMap key={routeId} scene={current.scene} exaggeration={exaggeration} />
            )}
          </Box>

          {current?.ok && (
            <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
              {LEGEND.map((item) => (
                <Stack key={item.label} direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
                  <Box
                    sx={
                      item.shape === 'line'
                        ? { width: 14, height: 3, borderRadius: 2, bgcolor: item.color, boxShadow: `0 0 6px ${item.color}` }
                        : {
                            width: 12,
                            height: 10,
                            borderRadius: 0.5,
                            border: `1px solid ${item.color}`,
                            bgcolor: item.shape === 'box' ? item.color : 'transparent',
                            opacity: item.shape === 'box' ? 0.7 : 1,
                          }
                    }
                  />
                  <Typography variant="caption">{item.label}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Stack sx={{ position: 'absolute', inset: 0, gap: 1, alignItems: 'center', justifyContent: 'center', p: 2 }}>
      {children}
    </Stack>
  );
}
