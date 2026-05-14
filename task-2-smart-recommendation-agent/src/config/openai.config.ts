import OpenAI from "openai";
import getEnv from "../utils/env";

const openaiClient = new OpenAI({
  baseURL: getEnv("OPENAI_BASE_URL"),
  apiKey: getEnv("OPENAI_API_KEY"),
});

export default openaiClient;