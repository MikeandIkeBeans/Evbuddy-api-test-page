export interface ChargePoint {
  id?: number;
  charge_point_id: string;
  charge_point_model?: string;
  charge_point_vendor?: string;
  online: boolean;
}

export interface Connector {
  connector_id: number;
  status?: string;
  current_transaction_id?: number;
  error_code?: string;
}

export interface ChargePointStatus {
  connectors?: Connector[];
  error?: string;
  [key: string]: unknown;
}

export interface HostSite {
  id: number;
  name?: string;
  site_name?: string;
  host_id?: number;
  address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  visibility?: string;
  site_visibility?: string;
}

export interface SiteCharger {
  id?: number;
  ocpp_identity?: string;
  name?: string;
  model?: string;
  charger_model?: string;
  status?: string;
}

export interface ChargingSession {
  sessionId: string;
  chargerId: string;
  connectorId: number;
  status?: string;
  energyKwh?: number;
  powerKw?: number;
  elapsedSec?: number;
  cost?: number;
  transactionId?: number;
  source?: string;
}
