export interface OpenAIChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface OpenAIChatCompletionRequest {
    model: string;
    messages: OpenAIChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

export interface OpenAIChatCompletionResponse {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: {
        index: number;
        message: OpenAIChatMessage;
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface LLMOverrideIdParts {
    type: string;
    name: string;
    agentId: string;
}
