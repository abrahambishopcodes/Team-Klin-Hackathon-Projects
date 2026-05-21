import api from "./axiosclient";

export const generateColdStartUserProfile = async (descriptionText: string) => {
    const response = await api.post("/generate-user-persona", { personaText: descriptionText });
    return response.data;
}