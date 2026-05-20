import Groq from "groq-sdk";
import getEnv from "../utils/env";

const groq = new Groq({
    apiKey: getEnv("AI_PROVIDER_API_KEY")
});

export default groq;