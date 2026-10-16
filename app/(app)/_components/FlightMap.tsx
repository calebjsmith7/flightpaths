'use client';

import * as React from 'react';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import { LineLayer, PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { cellToBoundary } from 'h3-js';
import { setWorkerUrl, type Map as MapLibreMap } from 'maplibre-gl';
import Map, { NavigationControl, useControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LAYER_SPACING_FT, LAYERS_FT } from '@/lib/routing/config';
import type { RouteScene, SceneCell, ScenePath, ScenePoint } from '@/lib/scene';

// The 3D view: a dark street map with each route drawn as a glowing path at its
// (exaggerated) altitude, a curtain of drop lines down to the ground, and each
// cell it shared with traffic as a stack of layer slabs showing which layer each
// side used there. Loaded on demand, since deck.gl and MapLibre are large.

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

// MapLibre looks for its worker next to its own file, which after bundling is a
// chunk directory where the worker doesn't exist. This makes the bundler emit
// the (self-contained) worker as an asset and points MapLibre at it.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
const M_PER_FT = 0.3048;

// Starting camera: tilted and turned so the altitude reads without losing the
// street layout.
const PITCH = 63.8;
const BEARING = -36.6;
const FIT_PADDING = 40;
// Extra room above the route: the fit measures its ground footprint, but the
// path is drawn hundreds of (exaggerated) metres up, which lands higher on screen.
const FIT_PADDING_TOP = 100;

type RGB = [number, number, number];
export const ROUTE_COLOR: RGB = [0, 240, 255];
export const TRAFFIC_COLOR: RGB = [255, 43, 214];
export const FREE_COLOR: RGB = [255, 184, 0];
const BASE_COLOR: RGB = [140, 150, 165];

// The glow layers stack on identical geometry; if they wrote depth they'd
// z-fight and punch dark specks into each other.
const NO_DEPTH_WRITE = { depthWriteEnabled: false } as const;

const withAlpha = ([r, g, b]: RGB, a: number): [number, number, number, number] => [r, g, b, a];
const toWhite = ([r, g, b]: RGB, f: number): RGB => [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f];

// One slab of a shared cell's stack. The base runs from the ground to the bottom
// of the lowest layer; above it, each slab is one layer, LAYER_SPACING_FT tall
// and centred on the layer's altitude.
type Slab = {
  polygon: [number, number, number][]; // z is the slab's bottom
  heightM: number;
  kind: 'base' | 'route' | 'traffic' | 'free';
  layerFt?: number;
};

const SLAB_COLORS: Record<Slab['kind'], { fill: [number, number, number, number]; line: [number, number, number, number] }> = {
  base: { fill: withAlpha(BASE_COLOR, 28), line: withAlpha(BASE_COLOR, 110) },
  route: { fill: withAlpha(ROUTE_COLOR, 80), line: withAlpha(ROUTE_COLOR, 220) },
  traffic: { fill: withAlpha(TRAFFIC_COLOR, 80), line: withAlpha(TRAFFIC_COLOR, 220) },
  free: { fill: withAlpha(FREE_COLOR, 8), line: withAlpha(FREE_COLOR, 110) },
};

export default function FlightMap({ scene, exaggeration }: { scene: RouteScene; exaggeration: number }) {
  const z = (ft: number) => ft * M_PER_FT * exaggeration;

  // Frame the user's route (not the traffic) so it fills the card.
  const routePoints = React.useMemo(
    () => (scene.paths.find((p) => p.kind === 'route') ?? scene.paths[0]).points.map(([lng, lat]): [number, number] => [lng, lat]),
    [scene],
  );
  const bounds = React.useMemo(() => boundsOf(routePoints), [routePoints]);

  const slabs = React.useMemo(() => cellSlabs(scene.cells, exaggeration), [scene, exaggeration]);

  const layers = [
    new PolygonLayer<Slab>({
      id: 'cell-slabs',
      data: slabs,
      getPolygon: (s) => s.polygon,
      extruded: true,
      wireframe: true,
      getElevation: (s) => s.heightM,
      getFillColor: (s) => SLAB_COLORS[s.kind].fill,
      getLineColor: (s) => SLAB_COLORS[s.kind].line,
      pickable: true,
      parameters: NO_DEPTH_WRITE,
    }),
    ...scene.paths.flatMap((path, i) => pathLayers(path, i, z, exaggeration)),
  ];

  return (
    <Map
      initialViewState={{ bounds, fitBoundsOptions: { padding: FIT_PADDING }, pitch: PITCH, bearing: BEARING }}
      onLoad={(e) => frameRoute(e.target, routePoints)}
      mapStyle={MAP_STYLE}
      maxPitch={85}
      style={{ width: '100%', height: '100%' }}
    >
      <DeckOverlay layers={layers} getTooltip={tooltip} />
      <NavigationControl position="top-right" visualizePitch />
    </Map>
  );
}

// Stacks each shared cell from the ground up to the highest layer anyone used
// there, colouring each layer by who flew through it.
function cellSlabs(cells: SceneCell[], exaggeration: number): Slab[] {
  const toM = (ft: number) => ft * M_PER_FT * exaggeration;
  const half = LAYER_SPACING_FT / 2;
  return cells.flatMap((c) => {
    const ring = cellToBoundary(c.cell, true);
    const at = (ft: number) => ring.map(([lng, lat]): [number, number, number] => [lng, lat, toM(ft)]);
    const top = Math.max(...c.routeLayersFt, ...c.trafficLayersFt);
    const stack: Slab[] = [{ polygon: at(0), heightM: toM(LAYERS_FT[0] - half), kind: 'base' }];
    for (const layer of LAYERS_FT.filter((l) => l <= top)) {
      const kind = c.routeLayersFt.includes(layer) ? 'route' : c.trafficLayersFt.includes(layer) ? 'traffic' : 'free';
      stack.push({ polygon: at(layer - half), heightM: toM(LAYER_SPACING_FT), kind, layerFt: layer });
    }
    return stack;
  });
}

function boundsOf(points: [number, number][]): [number, number, number, number] {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

// Tilts the camera, then zooms and re-centres until the route's on-screen
// footprint fills the view. MapLibre's own fitBounds frames for a top-down view
// and the tilt then shrinks the route, so this measures what's actually drawn.
// Perspective makes the fit non-linear, so it takes a few passes to settle.
function frameRoute(map: MapLibreMap, points: [number, number][]) {
  const camera = map.cameraForBounds(boundsOf(points), { padding: FIT_PADDING, bearing: BEARING });
  if (!camera) {
    return;
  }
  map.jumpTo({ ...camera, pitch: PITCH, bearing: BEARING });
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  // The box the route should fill, and how far its centre sits from the view's.
  const box = { left: FIT_PADDING, right: width - FIT_PADDING, top: FIT_PADDING_TOP, bottom: height - FIT_PADDING };
  const offsetX = width / 2 - (box.left + box.right) / 2;
  const offsetY = height / 2 - (box.top + box.bottom) / 2;
  for (let pass = 0; pass < 5; pass++) {
    const px = points.map((p) => map.project(p));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((box.right - box.left) / (maxX - minX), (box.bottom - box.top) / (maxY - minY));
    map.jumpTo({
      center: map.unproject([(minX + maxX) / 2 + offsetX, (minY + maxY) / 2 + offsetY]),
      zoom: map.getZoom() + Math.log2(scale),
    });
  }
}

function pathLayers(path: ScenePath, index: number, z: (ft: number) => number, exaggeration: number) {
  const color = path.kind === 'route' ? ROUTE_COLOR : TRAFFIC_COLOR;
  const lifted = path.points.map(([lng, lat, ft]): [number, number, number] => [lng, lat, z(ft)]);
  const flat = path.points.map(([lng, lat]): [number, number, number] => [lng, lat, 0]);
  const id = `${path.kind}-${index}`;
  const triggers = { getPath: exaggeration };
  const glow = (suffix: string, width: number, rgba: [number, number, number, number]) =>
    new PathLayer({
      id: `${id}-${suffix}`,
      data: [lifted],
      getPath: (d) => d,
      getColor: rgba,
      getWidth: width,
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
      billboard: true,
      parameters: NO_DEPTH_WRITE,
      updateTriggers: triggers,
    });

  return [
    // Its shadow on the ground, so the climb reads against the street below.
    new PathLayer({
      id: `${id}-shadow`,
      data: [flat],
      getPath: (d) => d,
      getColor: withAlpha(color, 70),
      getWidth: 2,
      widthUnits: 'pixels',
    }),
    // The curtain: a line from the ground up to every sample.
    new LineLayer<ScenePoint>({
      id: `${id}-drops`,
      data: path.points,
      getSourcePosition: ([lng, lat]) => [lng, lat, 0],
      getTargetPosition: ([lng, lat, ft]) => [lng, lat, z(ft)],
      getColor: withAlpha(color, 60),
      getWidth: 1,
      parameters: NO_DEPTH_WRITE,
      updateTriggers: { getTargetPosition: exaggeration },
    }),
    // Neon: a wide faint halo, a mid glow, and a bright core.
    glow('halo', 16, withAlpha(color, 35)),
    glow('glow', 7, withAlpha(color, 110)),
    glow('core', 2.5, withAlpha(toWhite(color, 0.55), 255)),
    // Invisible hover targets at each sample, for the altitude tooltip.
    new ScatterplotLayer<ScenePoint>({
      id: `${id}-hover`,
      data: path.points,
      getPosition: ([lng, lat, ft]) => [lng, lat, z(ft)],
      getRadius: 9,
      radiusUnits: 'pixels',
      billboard: true,
      getFillColor: [0, 0, 0, 1],
      pickable: true,
      parameters: NO_DEPTH_WRITE,
      updateTriggers: { getPosition: exaggeration },
    }),
  ];
}

const TOOLTIP_STYLE = { background: '#0b0f14', color: '#e6f7ff', fontSize: '12px', borderRadius: '4px', padding: '4px 8px' };
const SLAB_LABELS = { route: 'your route', traffic: 'traffic', free: 'free' };

function tooltip(info: PickingInfo) {
  const layerId = info.layer?.id ?? '';
  if (layerId === 'cell-slabs' && info.object) {
    const slab = info.object as Slab;
    return slab.kind === 'base' ? null : { text: `${slab.layerFt} ft layer · ${SLAB_LABELS[slab.kind]}`, style: TOOLTIP_STYLE };
  }
  if (!layerId.endsWith('-hover') || !info.object) {
    return null;
  }
  const point = info.object as ScenePoint;
  const label = layerId.startsWith('route') ? 'Your route' : 'Traffic';
  return {
    text: `${label} · ${Math.round(point[2])} ft AGL`,
    style: TOOLTIP_STYLE,
  };
}

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
