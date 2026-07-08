"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapProject {
  id: string;
  name: string;
  boundary: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
  timelineStart: string;
  timelineEnd: string;
  milestones: { name: string; plannedDate: string; status: string }[];
}

interface ProjectMapProps {
  projects: MapProject[];
  /** Optional GeoServer WMS endpoint (OGC layer) shown as an overlay. */
  wmsUrl?: string;
}

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function toFeatureCollection(projects: MapProject[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: projects.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: p.boundary,
      properties: {
        name: p.name,
        timeline: `${p.timelineStart.slice(0, 10)} → ${p.timelineEnd.slice(0, 10)}`,
        milestones: p.milestones.length,
      },
    })),
  };
}

export default function ProjectMap({ projects, wmsUrl }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [wmsOn, setWmsOn] = useState(false);

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [OSM_TILES],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [30.06, -1.97], // near Kigali
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/refresh project GeoJSON layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const fc = toFeatureCollection(projects);

    const render = () => {
      if (!map.getSource("projects")) {
        map.addSource("projects", { type: "geojson", data: fc });
        map.addLayer({
          id: "projects-fill",
          type: "fill",
          source: "projects",
          paint: { "fill-color": "#2E5FA8", "fill-opacity": 0.25 },
        });
        map.addLayer({
          id: "projects-line",
          type: "line",
          source: "projects",
          paint: { "line-color": "#14355F", "line-width": 2 },
        });
        map.on("click", "projects-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties as Record<string, string>;
          new maplibregl.Popup()
            .setLngLat((e.lngLat))
            .setHTML(`<strong>${props.name}</strong><br/>${props.timeline}<br/>${props.milestones} milestones`)
            .addTo(map);
        });
      } else {
        (map.getSource("projects") as maplibregl.GeoJSONSource).setData(fc);
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [projects]);

  // Optional GeoServer WMS overlay toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !wmsUrl) return;
    if (wmsOn && !map.getSource("geoserver-wms")) {
      map.addSource("geoserver-wms", {
        type: "raster",
        tiles: [
          `${wmsUrl}?service=WMS&version=1.1.1&request=GetMap&layers=projectwatch:projects&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`,
        ],
        tileSize: 256,
      });
      map.addLayer({ id: "geoserver-wms-layer", type: "raster", source: "geoserver-wms" });
    } else if (!wmsOn && map.getLayer("geoserver-wms-layer")) {
      map.removeLayer("geoserver-wms-layer");
      map.removeSource("geoserver-wms");
    }
  }, [wmsOn, wmsUrl]);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{projects.length} project{projects.length === 1 ? "" : "s"} on map</strong>
        {wmsUrl && (
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={wmsOn}
              onChange={(e) => setWmsOn((e.target as HTMLInputElement).checked)}
            />
            GeoServer WMS overlay
          </label>
        )}
      </div>
      <div ref={containerRef} style={{ width: "100%", height: 520, borderRadius: 8, border: "1px solid var(--line, #D3DCE7)" }} />
    </div>
  );
}
