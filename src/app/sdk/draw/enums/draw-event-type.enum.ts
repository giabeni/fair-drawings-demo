export enum DrawEventType {
  // Handling persistence
  DRAW_CREATED = 'DRAW_CREATED',
  DRAW_DELETED = 'DRAW_DELETED',

  // Handling stakeholders updates
  STAKEHOLDER_SUBSCRIBED = 'STAKEHOLDER_SUBSCRIBED',
  STAKEHOLDER_UNSUBSCRIBED = 'STAKEHOLDER_UNSUBSCRIBED',
  CANDIDATE_SUBSCRIBED = 'CANDIDATE_SUBSCRIBED',
  CANDIDATE_UNSUBSCRIBED = 'CANDIDATE_UNSUBSCRIBED',

  // Handling commits and reveals
  COMMIT_RECEIVED = 'COMMIT_RECEIVED',
  REVEAL_RECEIVED = 'REVEAL_RECEIVED',
  ALL_COMMITS_RECEIVED = 'ALL_COMMITS_RECEIVED',
  ALL_REVEALS_RECEIVED = 'ALL_REVEALS_RECEIVED',

  // Handling draw status changes
  STATUS_CHANGED = 'STATUS_CHANGED',

  // Handling format exceptions
  WRONG_COMMIT_FORMAT = 'INVALID_COMMIT_FORMAT',
  WRONG_REVEAL_FORMAT = 'INVALID_REVEAL_FORMAT',

  // Handling inconsistencies and cheats
  INVALID_REVEAL_MASK = 'INVALID_REVEAL_MASK',

  // Handling external interference
  FORBIDDEN_COMMIT_USER_ID = 'FORBIDDEN_COMMIT_USER_ID',
  FORBIDDEN_REVEAL_USER_ID = 'FORBIDDEN_REVEAL_USER_ID',

  // Handling signature
  UNAUTHORIZED_COMMIT_SIGNATURE = 'UNAUTHORIZED_COMMIT_SIGNATURE',
  UNAUTHORIZED_REVEAL_SIGNATURE = 'UNAUTHORIZED_REVEAL_SIGNATURE',

  // Syncronizing
  ACK = 'ACK'

}
