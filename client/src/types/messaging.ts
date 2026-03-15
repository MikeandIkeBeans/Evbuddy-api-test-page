export type ThreadType = "REQUEST" | "APPROVAL" | "SUPPORT" | "GENERAL";
export type ThreadStatus = "OPEN" | "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type EntityType = "HOST_SITE" | "CHARGER" | "BOOKING" | "DRIVER" | "OTHER";
export type MessageType = "TEXT" | "SYSTEM" | "ACTION" | "TEMPLATE";
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER" | "OBSERVER";
export type TemplateCategory = "SUPPORT" | "APPROVAL" | "REQUEST" | "GENERAL";

export interface Thread {
  id: number;
  threadType: ThreadType;
  subject?: string;
  status: ThreadStatus;
  priority: Priority;
  createdByAccountId: number;
  assignedToAccountId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt?: string;
}

export interface Message {
  id: number;
  senderAccountId: number;
  messageType: MessageType;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Participant {
  accountId?: number;
  account_id?: number;
  role: ParticipantRole;
  muted?: boolean;
  canPost?: boolean;
  joinedAt?: string;
  createdAt?: string;
}

export interface StatusEvent {
  id: number;
  fromStatus?: string;
  toStatus: string;
  actorAccountId: number;
  eventReason?: string;
  createdAt?: string;
}

export interface Attachment {
  id: number;
  fileName?: string;
  contentType?: string;
  fileSizeBytes?: number;
  sizeBytes?: number;
  storageKey?: string;
  storageUrl?: string;
  downloadUrl?: string;
}

export interface MessageTemplate {
  id: number;
  templateKey?: string;
  category?: TemplateCategory;
  title?: string;
  body?: string;
  isActive?: boolean;
}
