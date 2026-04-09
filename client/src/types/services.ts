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
