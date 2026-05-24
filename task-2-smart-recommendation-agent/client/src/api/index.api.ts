import api from "./axiosclient";
import type { AiRecommendproductResponse } from "@/types";

export const generateColdStartUserProfile = async (descriptionText: string) => {
    const response = await api.post("/generate-user-persona", { personaText: descriptionText });
    return response.data;
}

interface GenerateRecommendationParams {
    user_query: string;
    cold_start: boolean;
    user_id?: string;
    user_persona?: object;
}

interface RecommendationStreamEvent {
    type: "status" | "final_response" | "end";
    data: string | AiRecommendproductResponse["data"];
}

interface GenerateRecommendationOptions {
    onStatus?: (status: string) => void;
}

export const generateRecommendation = async (
    params: GenerateRecommendationParams,
    options?: GenerateRecommendationOptions,
): Promise<AiRecommendproductResponse["data"]> => {
    const response = await fetch(`${api.defaults.baseURL}/recommend`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error(`Recommendation request failed with status ${response.status}`);
    }

    if (!response.body) {
        throw new Error("Streaming response body is not available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResponse: AiRecommendproductResponse["data"] | null = null;

    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
            const lines = eventBlock
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

            const payloadLine = lines.find(
                (line) => line.startsWith("event:") || line.startsWith("data:"),
            );

            if (!payloadLine) {
                continue;
            }

            const rawPayload = payloadLine.replace(/^(event|data):\s*/, "");
            const parsedEvent = JSON.parse(rawPayload) as RecommendationStreamEvent;

            if (parsedEvent.type === "status" && typeof parsedEvent.data === "string") {
                options?.onStatus?.(parsedEvent.data);
            }

            if (parsedEvent.type === "final_response" && typeof parsedEvent.data === "object") {
                finalResponse = parsedEvent.data;
            }
        }

        if (done) {
            break;
        }
    }

    if (!finalResponse) {
        throw new Error("Recommendation stream ended before a final response was received");
    }

    return finalResponse;
}

export const getAllDemoUsers = async () => {
    const response = await api.get("/demo-users");
    return response.data;
}
