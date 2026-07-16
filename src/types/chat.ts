export interface ChatAttachment {
  path: string;
  name: string;
  mimeType: string;
  url?: string;
}

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: ChatAttachment[];
  audio?: ChatAttachment;
  transcript?: string;
  sources?: ChatSource[];
}
