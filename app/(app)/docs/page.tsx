import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { API_DAILY_LIMIT } from "@/lib/api-usage";
import {
  CEILING_FT,
  DEFAULT_CRUISE_SPEED_MPS,
  DENSIFY_SPACING_M,
  FLOOR_FT,
  LAYER_SPACING_FT,
  layersForHeading,
  MAX_CRUISE_SPEED_MPS,
  MAX_ROUTE_M,
  MPS_PER_MPH,
  RESERVATION_MARGIN_MS,
  VERTICAL_RATE_FT_PER_S,
} from "@/lib/routing/config";

// Limits are imported from the code so the docs can't drift from it.
const DEFAULT_MPH = Math.round(DEFAULT_CRUISE_SPEED_MPS / MPS_PER_MPH);
const MAX_MPH = Math.round(MAX_CRUISE_SPEED_MPS / MPS_PER_MPH);
const MARGIN_MIN = RESERVATION_MARGIN_MS / 60_000;
const CLIMB_FPM = Math.round(VERTICAL_RATE_FT_PER_S * 60);
const EASTBOUND = layersForHeading(90).join(", ");
const WESTBOUND = layersForHeading(270).join(", ");

const CURL = `curl -X POST "$FLIGHTPATHS_URL/api/v1/routes?cruiseSpeedMph=60" \\
  -H "Authorization: Bearer $FLIGHTPATHS_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data @route.json`;

const RESPONSE = `{
  "routes": [ … your request body, unchanged … ],
  "flightpaths": {
    "routeId": "Xq3kT9mC2pLw8Rv1aZbE",
    "source": "routes-api",
    "elevationSource": "google",
    "headingDeg": 42.3,
    "minAltitudeAglFt": 150,
    "maxAltitudeAglFt": 250,
    "layerChanges": 4,
    "segments": [
      { "altitudeAglFt": 200, "fromIndex": 0, "toIndex": 16,
        "startDistanceMeters": 0, "endDistanceMeters": 810.4 },
      { "altitudeAglFt": 150, "fromIndex": 18, "toIndex": 89,
        "startDistanceMeters": 910.2, "endDistanceMeters": 4470.8 },
      …
    ],
    "cruiseSpeedMps": 26.8224,
    "distanceMeters": 9525.5,
    "departAt": "2026-10-16T17:00:00.000Z",
    "arriveAt": "2026-10-16T17:05:55.131Z",
    "points": [
      { "lat": 30.2622, "lng": -97.7451, "distanceMeters": 0,
        "eta": "2026-10-16T17:00:00.000Z", "groundElevationFt": 489.2,
        "altitudeAglFt": 200, "altitudeMslFt": 689.2 },
      …
    ],
    "path": {
      "type": "LineString",
      "coordinates": [[-97.7451, 30.2622, 149.11], [-97.7451, 30.2622, 210.07], …]
    }
  }
}`;

export default function ApiDocsPage() {
  return (
    <Stack sx={{ gap: 4, maxWidth: 860 }}>
      <Stack sx={{ gap: 1 }}>
        <Typography component="h1" variant="h4">
          API docs
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          Send a Google driving route and get it back with a drone altitude for every point along it. Each route is
          given its own slice of low-altitude airspace, so routes that would cross or share a road at the same time
          are separated vertically.
        </Typography>
      </Stack>

      <Section id="quickstart" title="Quick start">
        <Typography component="ol" variant="body2" sx={{ pl: 2.5, m: 0, "& li": { mb: 0.5 } }}>
          <li>
            Get a route from the Google{" "}
            <Ext href="https://developers.google.com/maps/documentation/routes/compute_route_directions">
              Routes API
            </Ext>{" "}
            (<code>computeRoutes</code>) or{" "}
            <Ext href="https://developers.google.com/maps/documentation/directions/get-directions">
              Directions API
            </Ext>{" "}
            and save the response as <code>route.json</code>.
          </li>
          <li>
            On <Link href="/profile">My profile</Link>, click <strong>Copy API token</strong>.
          </li>
          <li>Send it:</li>
        </Typography>
        <Code>{CURL}</Code>
        <Typography variant="body2">
          The response is your JSON with a <code>flightpaths</code> block added. The route is saved to your account
          and shows up on the <Link href="/">Home</Link> visualizer like any other.
        </Typography>
      </Section>

      <Section id="authentication" title="Authentication">
        <Typography variant="body2">
          Every request needs a bearer token: <code>Authorization: Bearer &lt;token&gt;</code>. Tokens are Firebase ID
          tokens for your account and <strong>expire after one hour</strong>; copy a fresh one from{" "}
          <Link href="/profile">My profile</Link> when yours runs out. Disabling the account revokes its tokens
          immediately.
        </Typography>
        <Typography variant="body2">
          If you already use Firebase Authentication in your own app with this project, you can get the token from{" "}
          <code>user.getIdToken()</code> instead.
        </Typography>
      </Section>

      <Section id="limits" title="Rate limit">
        <Typography variant="body2">
          Each account can make <strong>{API_DAILY_LIMIT} requests per day</strong>, resetting at midnight UTC. Every
          authenticated request counts, including ones rejected for a bad body. Each response includes:
        </Typography>
        <FieldTable
          rows={[
            ["X-RateLimit-Limit", "Requests allowed per day."],
            ["X-RateLimit-Remaining", "Requests left today."],
            ["X-RateLimit-Reset", "When the count resets, as a Unix timestamp in seconds."],
            ["Retry-After", "On a 429 only: seconds until the reset."],
          ]}
          head={["Header", "Meaning"]}
        />
      </Section>

      <Section id="plan-route" title="Plan a route">
        <Box
          sx={{
            fontFamily: "monospace",
            fontSize: 15,
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: "action.hover",
            alignSelf: "flex-start",
          }}
        >
          POST /api/v1/routes
        </Box>

        <Typography variant="subtitle2">Request body</Typography>
        <Typography variant="body2">
          A Google route response as JSON, up to 5 MB. Send the whole response or a single route object. These are
          read, in this order:
        </Typography>
        <FieldTable
          head={["Format", "Fields used"]}
          rows={[
            [
              "Routes API",
              <>
                <code>polyline.encodedPolyline</code> or <code>polyline.geoJsonLinestring</code>, else every{" "}
                <code>legs[].steps[].polyline.encodedPolyline</code>
              </>,
            ],
            [
              "Directions API",
              <>
                every <code>legs[].steps[].polyline.points</code>, else <code>overview_polyline</code> (less detailed)
              </>,
            ],
          ]}
        />
        <Typography variant="body2">
          With alternatives, the first route is used. A Directions response whose <code>status</code> isn’t{" "}
          <code>OK</code> is rejected.
        </Typography>

        <Typography variant="subtitle2">Query parameters</Typography>
        <FieldTable
          head={["Parameter", "Description"]}
          rows={[
            [
              "departureTime",
              <>
                Optional. ISO 8601 time, e.g. <code>2026-10-16T17:00:00Z</code>. Defaults to now. Airspace is reserved
                for when the vehicle will actually be in it, so this matters.
              </>,
            ],
            [
              "cruiseSpeedMph",
              <>
                Optional. Defaults to {DEFAULT_MPH}. Up to {MAX_MPH} (the Part 107 limit). Flight times come from this,
                not Google’s driving times.
              </>,
            ],
          ]}
        />

        <Typography variant="subtitle2">Response</Typography>
        <Typography variant="body2">
          <code>200 OK</code> with your request body unchanged plus a <code>flightpaths</code> object. The route is
          saved and its airspace reserved.
        </Typography>
        <Code>{RESPONSE}</Code>
        <FieldTable
          head={["Field", "Description"]}
          rows={[
            ["routeId", "The saved route’s ID."],
            [
              "source",
              <>
                Which format was read: <code>routes-api</code> or <code>directions-api</code>.
              </>,
            ],
            [
              "elevationSource",
              <>
                <code>google</code> if ground elevation came from Google’s Elevation API. <code>none</code> means
                ground was treated as sea level, so MSL altitudes aren’t accurate.
              </>,
            ],
            ["headingDeg", "Overall direction of travel, origin to destination. Decides which layers the route uses."],
            ["minAltitudeAglFt / maxAltitudeAglFt", "Lowest and highest layers flown."],
            ["layerChanges", "How many times the route climbs or descends between layers."],
            [
              "segments[]",
              <>
                Stretches flown level at one layer: <code>altitudeAglFt</code>, the <code>points</code> index range
                (<code>fromIndex</code>–<code>toIndex</code>) and the distance range. Climbs and descents fall in the
                gaps between segments.
              </>,
            ],
            ["cruiseSpeedMps", "Speed used for timing, in m/s."],
            ["distanceMeters", "Length of the flight path."],
            ["departAt / arriveAt", "Takeoff and landing times (ISO 8601, UTC)."],
            [
              "points[]",
              <>
                The flight path, one point at least every {DENSIFY_SPACING_M} m: <code>lat</code>, <code>lng</code>,{" "}
                <code>distanceMeters</code> from the start, <code>eta</code>, <code>groundElevationFt</code>,{" "}
                <code>altitudeAglFt</code> (above ground) and <code>altitudeMslFt</code> (above sea level). AGL
                values between layers are mid-climb or mid-descent.
              </>,
            ],
            [
              "path",
              <>
                The same path as a GeoJSON <code>LineString</code> of <code>[lng, lat, metres MSL]</code>, starting
                and ending on the ground for takeoff and landing. Ready for map libraries.
              </>,
            ],
          ]}
        />
      </Section>

      <Section id="errors" title="Errors">
        <Typography variant="body2">
          Errors return JSON as <code>{`{ "error": { "code": "…", "message": "…" } }`}</code>. The message is written
          to be shown to a person.
        </Typography>
        <FieldTable
          head={["Status", "Code", "When"]}
          rows={[
            ["400", "invalid_json", "The body isn’t valid JSON."],
            ["400", "invalid_route", "No route path could be read from the body, or it has bad coordinates."],
            ["401", "unauthenticated", "No bearer token."],
            ["401", "invalid_token", "The token is invalid, expired or revoked."],
            ["409", "airspace_full", "No free path through the airspace at that time. Try a later departure."],
            ["413", "body_too_large", "The body is over 5 MB."],
            [
              "422",
              "invalid_parameter",
              `A bad departureTime or cruiseSpeedMph, or a route over ${MAX_ROUTE_M / 1000} km.`,
            ],
            ["429", "rate_limited", "The daily limit is used up."],
            ["500", "internal", "Something went wrong on our side."],
          ]}
        />
      </Section>

      <Section id="how-it-works" title="How altitudes are assigned">
        <Typography variant="body2">
          Routes follow roads, since roads are clear of buildings at low altitude. Altitude is measured above the
          ground (AGL) and follows the terrain.
        </Typography>
        <FieldTable
          head={["", ""]}
          hideHead
          plainKeys
          rows={[
            [
              "Altitude band",
              `${FLOOR_FT}–${CEILING_FT} ft AGL. The ceiling is the Part 107 drone limit, which keeps 100 ft below the 500 ft that manned aircraft can fly down to.`,
            ],
            [
              "Layers",
              `Every ${LAYER_SPACING_FT} ft, within what GPS plus barometric altitude can hold. Routes heading 0–179° use ${EASTBOUND} ft; routes heading 180–359° use ${WESTBOUND} ft, so opposing traffic never shares a layer.`,
            ],
            [
              "Airspace grid",
              "The map is split into hexagonal cells about 150 m across (H3 resolution 10). A route reserves its layer in each cell for the time it’s there.",
            ],
            ["Time margin", `Each reservation is padded by ${MARGIN_MIN} minutes either side.`],
            [
              "Layer changes",
              `A route takes the lowest free layer in each cell and climbs only around traffic, at ${CLIMB_FPM} ft/min. It reserves every layer it passes through while climbing or descending, plus the column below it at takeoff and landing. It drops back down only when the lower layer stays free for a while, so it doesn’t hop up and down.`,
            ],
            [
              "Conflicts",
              "If no sequence of free layers gets the route from takeoff to landing, the request fails with 409 airspace_full.",
            ],
          ]}
        />
        <Alert severity="info" variant="outlined">
          Planning is first come, first served: a route keeps its airspace once reserved, and later routes work around
          it.
        </Alert>
      </Section>
    </Stack>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack component="section" id={id} sx={{ gap: 1.5, scrollMarginTop: 16 }}>
      <Typography component="h2" variant="h5">
        {title}
      </Typography>
      <Divider />
      {children}
    </Stack>
  );
}

function Code({ children }: { children: string }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        overflowX: "auto",
        borderRadius: 1,
        bgcolor: "#0b0f14",
        color: "#e6f7ff",
        fontFamily: "monospace",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

// Leading columns are field names, so they're monospace unless plainKeys is set.
function FieldTable({
  head,
  rows,
  hideHead,
  plainKeys,
}: {
  head: string[];
  rows: ReactNode[][];
  hideHead?: boolean;
  plainKeys?: boolean;
}) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        {!hideHead && (
          <TableHead>
            <TableRow>
              {head.map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell
                  key={j}
                  sx={{
                    verticalAlign: "top",
                    ...(j < row.length - 1 && { whiteSpace: "nowrap", fontWeight: plainKeys ? 500 : undefined }),
                    ...(j < row.length - 1 && !plainKeys && { fontFamily: "monospace" }),
                  }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
