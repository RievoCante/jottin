
export interface Note {
  id: string;
  title: string;
  content: string;
  domain?: string;
  date: string;
  collectionId?: string;
  isPinned?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}