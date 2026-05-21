
export interface Product {
    average_rating: number;
    description: string[];
    features: string[];
    main_category: string;
    parent_asin: string;
    price: string;
    rating_number: number;
    store: string;
    title: string;
    reasoning: string;
}

export interface AiRecommendproductResponse {
    success: boolean;
    message: string;
    data: {
        interpretedQuery: string;
        products: Product[];
        main_reasoning: string;
        tokenUsage: {
            queue_time: number;
            prompt_tokens: number;
            prompt_time: number;
            completion_tokens: number;
            completion_time: number;
            total_tokens: number;
            total_time: number;
        };
    };
};