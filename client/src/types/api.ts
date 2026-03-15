// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  duration: number;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
