
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

export interface DemoUser {
    id: string;
    user_id: string;
    user_name: string;
    avatarUrl: string;
    rating_count: number;
    avg_rating: number;
    avg_rating_text_length: number;
    persona_summary: {
        quality_bar: string;
        brand_signals: string[];
        taste_summary: string;
        purchase_drivers: string[];
        recent_purchases: string[];
        price_sensitivity: string;
        preferred_categories: string[];
        price_range_estimate: string;
        review_tone_patterns: string;
        typical_dealbreakers: string[];
    }
}