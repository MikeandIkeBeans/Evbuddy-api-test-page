export interface ApiRoute {
  method: string;
  path: string;
  desc: string;
}

export interface ApiCatalogGroup {
  title: string;
  icon: string;
  description: string;
  backend: string;
  routes: ApiRoute[];
}

export interface ServiceInfo {
  port: number;
  base_url: string;
  available: boolean;
}

export interface ServicesSummary {
  available: number;
  unavailable: number;
  total: number;
}

export interface ServicesResponse {
  services: Record<string, ServiceInfo>;
  summary: ServicesSummary;
  microservice_host?: string;
}
