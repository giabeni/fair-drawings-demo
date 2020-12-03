export interface PaginationResponse<T = any> {
  page: number;
  pageCount: number;
  totalCount: number;
  items: T[];
}
