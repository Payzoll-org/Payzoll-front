import { usePromptStore } from '../Zustand/AgentConfiguration';

export interface MessageData {
  id: string;
  content: string;
  type: 'call' | 'chat';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    phoneNumber?: string;
    callDuration?: number;
    callStatus?: 'initiated' | 'connected' | 'ended' | 'failed';
  };
}

export class MessageService {
  private static instance: MessageService;
  private messageHistory: MessageData[] = [];

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }


  

  async sendChatMessage(content: string, sessionId?: string): Promise<{ message: MessageData; sessionId: string }> {
    const prompt = usePromptStore.getState().prompt;
    const payload = sessionId
      ? { session_id: sessionId, message: content ,prompt: prompt,}
      : { message: content ,prompt: prompt};
  
    console.log("Sending payload to backend:", payload);
  
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  
    const data = await response.json();
    console.log("Received from backend:", data);
  
    const message: MessageData = {
      id: Date.now().toString(),
      content: data.response, // agent's reply
      type: "chat",
      timestamp: new Date(),
      status: "delivered",
    };
  
    this.messageHistory.push(message);
  
    return { message, sessionId: data.session_id };
  }




  getMessageHistory(): MessageData[] {
    return [...this.messageHistory];
  }

  getMessagesByType(type: 'call' | 'chat'): MessageData[] {
    return this.messageHistory.filter(msg => msg.type === type);
  }

  clearHistory(): void {
    this.messageHistory = [];
  }
}



// Export a singleton instance
export const messageService = MessageService.getInstance();

// Utility functions for external use


export const sendChatMessage = (content: string, sessionId?: string) => {
  return messageService.sendChatMessage(content, sessionId);
};

export const getMessageHistory = () => {
  return messageService.getMessageHistory();
}; 

