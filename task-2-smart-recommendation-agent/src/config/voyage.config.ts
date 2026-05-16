import { VoyageAIClient } from "voyageai";
import getEnv from "../utils/env";

const voyage = new VoyageAIClient({
    apiKey: getEnv("VOYAGE_API_KEY")
})

export default voyage;