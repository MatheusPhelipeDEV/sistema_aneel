export interface Interruption {
  dia: string;
  DatInicioInterrupcao: string;
  DatFimInterrupcao: string;
  DscFatoGeradorInterrupcao: string;
  DscTipoInterrupcao: string;
  NumOrdemInterrupcao: string;
  NomAgenteRegulado?: string; // Opcional (Modo CIA)
  SigAgente?: string; // Opcional (Modo CIA)
  NumUnidadeConsumidora?: string; // Opcional (Modo UC)
  DscConjuntoUnidadeConsumidora: string;
}

export interface MetaData {
  request_id: string;
  timing_ms: number;
  total_ano?: number;
}

export interface ApiResponse {
  data: Interruption[];
  total: number;
  returned: number;
  page: number;
  page_size: number;
  meta: MetaData;
}

export interface FilterState {
  di: string;
  df: string;
  modo: "cia" | "uc";
  termo: string;
  pageSize: number;
}
