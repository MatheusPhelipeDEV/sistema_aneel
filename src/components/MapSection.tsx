import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Interruption } from "../types";
import L from "leaflet";

// --- CORREÇÃO DOS ÍCONES (USANDO CDN PARA NÃO QUEBRAR) ---
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Coordenadas Centrais dos Estados Brasileiros
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-8.77, -70.55],
  AL: [-9.62, -36.82],
  AM: [-3.47, -65.1],
  AP: [1.41, -51.77],
  BA: [-13.29, -41.71],
  CE: [-5.2, -39.53],
  DF: [-15.83, -47.86],
  ES: [-19.65, -40.47],
  GO: [-16.04, -50.06],
  MA: [-5.42, -45.44],
  MG: [-18.1, -44.38],
  MS: [-20.51, -54.54],
  MT: [-12.64, -55.42],
  PA: [-3.79, -52.48],
  PB: [-7.28, -36.72],
  PE: [-8.38, -37.86],
  PI: [-6.6, -42.28],
  PR: [-24.89, -51.55],
  RJ: [-22.25, -42.66],
  RN: [-5.81, -36.59],
  RO: [-10.83, -63.34],
  RR: [1.99, -61.33],
  RS: [-30.17, -53.5],
  SC: [-27.45, -50.95],
  SE: [-10.57, -37.45],
  SP: [-22.19, -48.79],
  TO: [-9.46, -48.49],
};

const AGENT_TO_STATE: Record<string, string> = {
  COPEL: "PR",
  CELESC: "SC",
  CEMIG: "MG",
  LIGHT: "RJ",
  "ENEL RJ": "RJ",
  "ENEL SP": "SP",
  "ENEL CE": "CE",
  "ENEL GO": "GO",
  "NEOENERGIA COELBA": "BA",
  "NEOENERGIA PERNAMBUCO": "PE",
  COSERN: "RN",
  ELEKTRO: "SP",
  CPFL: "SP",
  "CPFL PAULISTA": "SP",
  "CPFL PIRATININGA": "SP",
  RGE: "RS",
  CEEE: "RS",
  "EQUATORIAL MA": "MA",
  "EQUATORIAL PA": "PA",
  "EQUATORIAL PI": "PI",
  "EQUATORIAL AL": "AL",
  "AMAZONAS ENERGIA": "AM",
  "RORAIMA ENERGIA": "RR",
  CEA: "AP",
  "ENERGISA TO": "TO",
  "ENERGISA MT": "MT",
  "ENERGISA MS": "MS",
  "ENERGISA PB": "PB",
  "ENERGISA SE": "SE",
  "ENERGISA AC": "AC",
  "ENERGISA RO": "RO",
  CAIUÁ: "SP",
  CERON: "RO",
  ELETROACRE: "AC",
};

interface MapSectionProps {
  data: Interruption[];
}

export function MapSection({ data }: MapSectionProps) {
  const centerPosition: [number, number] = [-14.235, -51.9253];

  const markersData = useMemo(() => {
    const counts: Record<string, number> = {};

    data.forEach((item) => {
      let uf = "BR";
      const name = (item.NomAgenteRegulado || "").toUpperCase();
      const sigla = (item.SigAgente || "").toUpperCase();

      const foundKey = Object.keys(AGENT_TO_STATE).find((key) =>
        name.includes(key)
      );
      if (foundKey) {
        uf = AGENT_TO_STATE[foundKey];
      } else if (sigla.length > 0) {
        if (name.includes("PARANÁ") || name.includes("COPEL")) uf = "PR";
        else if (name.includes("SANTA CATARINA") || name.includes("CELESC"))
          uf = "SC";
        else if (name.includes("MINAS GERAIS") || name.includes("CEMIG"))
          uf = "MG";
        else if (name.includes("SÃO PAULO") || name.includes("PAULISTA"))
          uf = "SP";
        else if (name.includes("RIO DE JANEIRO")) uf = "RJ";
        else if (name.includes("RIO GRANDE DO SUL")) uf = "RS";
      }

      if (STATE_COORDS[uf]) {
        counts[uf] = (counts[uf] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([uf, count]) => ({
      uf,
      count,
      position: STATE_COORDS[uf],
    }));
  }, [data]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-700">
          Geolocalização (Estados Atingidos)
        </h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          Distribuição Espacial
        </span>
      </div>

      <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
        {/* CORREÇÃO DO SCROLL: scrollWheelZoom={true} */}
        <MapContainer
          center={centerPosition}
          zoom={4}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markersData.map((marker) => (
            <Marker key={marker.uf} position={marker.position}>
              <Popup>
                <div className="text-center min-w-[100px]">
                  <strong className="text-blue-600 text-lg block mb-1">
                    {marker.uf}
                  </strong>
                  <span className="text-slate-600 font-medium">
                    {marker.count} interrupções
                  </span>
                  <p className="text-xs text-slate-400 mt-2 border-t pt-1">
                    Baseado na distribuidora
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {markersData.length === 0 && (
            <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs z-[1000]">
              Nenhum estado detectado nos resultados.
            </div>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
