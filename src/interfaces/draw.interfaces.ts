export enum DrawStatus {
  /**
   * Drawing procedure is not ready to begin.
   */
  PENDING = 0,

  /**
   * Drawing procedure is in the commit phase.
   * (Stakeholders must send their commit).
   */
  COMMIT = 1,

  /**
   * Drawing procedure is in the reval phase
   * (Candidates must send their reveal).
   */
  REVEAL = 2,

  /**
   * Drawing procedure has been successfully finished.
   * (Winner has been drawn)
   */
  FINISHED = 3,

  /**
   * Drawing procedure has been cancelled due to:
   * - sending of invalid reveal
   * - stakeholders agreed to revoke draw
   */
  INVALIDATED = -1,
}

export interface Draw {
  uuid?: string;
  data?: DrawData;
  spots?: number;
  status?: DrawStatus;
  candidates?: any;
  candidatesCount?: number;
}

export interface DrawData {
  title: string;
  description: string;
  private: boolean;
  password?: string;
  [key: string]: any;
}

export interface PaginationResponse<T = any> {
  page: number;
  pageCount: number;
  totalCount: number;
  items: T[];
}

export const wait = async (ms) => {
  return new Promise(res => setTimeout(() => res(), ms));
};

