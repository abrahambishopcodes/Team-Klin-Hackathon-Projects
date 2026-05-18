import openaiClient from "../config/openai.config";
import getEnv from "./env";

const model = getEnv("AI_BASE_MODEL");

export const generateQuery = async (
  user_persona: string,
  userQuery: string,
) => {
  const queryResponse = await openaiClient.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert in generating queries for a vector database to retrieve relevant information. return just the query alone, do not add any extra texts or formattings.",
      },
      {
        role: "user",
        content: `You are to generate a query in natural language based on the user's original query and their profile.
                
                User query: ${userQuery}
                User profile: ${JSON.stringify(user_persona)}
                
                Generate a query that will help retrieve relevant information from the vector database.`,
      },
    ],
  });

  return queryResponse?.choices?.[0]?.message?.content || "";
};
