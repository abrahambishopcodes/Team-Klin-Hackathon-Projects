import groq from "../config/groq.config";

export const generateQuery = async (
  user_persona: string,
  userQuery: string,
) => {
  const queryResponse = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `
        You are an expert in generating queries for a vector database to retrieve relevant information. return just the query alone, do not add any extra texts or formatings.
        You are to generate a query in natural language based on the user's original query and their profile.
                
                User query: ${userQuery}
                User profile: ${JSON.stringify(user_persona)}
                
                Generate a query that will help retrieve relevant information from the vector database.`,
      },
    ],
  });

  return queryResponse?.choices?.[0]?.message?.content;
};
