import api from "./axiosclient";

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

export const generateRecommendation = async (params: GenerateRecommendationParams) => {
    const response = await api.post("/recommend", params);
    return response.data;
}