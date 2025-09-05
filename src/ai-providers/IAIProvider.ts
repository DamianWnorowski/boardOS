
interface CodeAnalysis {
  quality: number;
  suggestions: string[];
  errors: string[];
}

interface AIContext {
  sessionId?: string;
  conversationHistory?: string[];
  metadata?: Record<string, unknown>;
}

export interface IAIProvider {
  generateText(prompt: string): Promise<string>;
  analyzeCode(code: string): Promise<CodeAnalysis>;
  manageContext(context: AIContext): Promise<void>;
  // Add other common AI interaction methods here
}
