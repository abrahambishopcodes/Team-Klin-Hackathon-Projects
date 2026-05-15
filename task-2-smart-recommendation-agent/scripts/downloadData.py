# Script to sample data from the Amazon Reviews 2023 dataset due to size constraints

from datasets import load_dataset
import json
import os

os.makedirs('data/raw', exist_ok=True)

CATEGORIES = [
    {
        "name": "Electronics",
        "review_config": "raw_review_Electronics",
        "meta_config": "raw_meta_Electronics",
        "review_sample": 25000,
        "meta_sample": 10000,
        "estimated_review_mb": 95,
        "estimated_meta_mb": 35,
    },
    {
        "name": "Grocery",
        "review_config": "raw_review_Grocery_and_Gourmet_Food",
        "meta_config": "raw_meta_Grocery_and_Gourmet_Food",
        "review_sample": 25000,
        "meta_sample": 10000,
        "estimated_review_mb": 70,
        "estimated_meta_mb": 25,
    },
    {
        "name": "Health",
        "review_config": "raw_review_Health_and_Personal_Care",
        "meta_config": "raw_meta_Health_and_Personal_Care",
        "review_sample": 25000,
        "meta_sample": 10000,
        "estimated_review_mb": 60,
        "estimated_meta_mb": 20,
    },
]

def format_size(bytes):
    mb = bytes / 1024 / 1024
    return f"{mb:.2f} MB"

def sample_reviews(name, config_name, sample_size):
    print(f"\n{'='*50}")
    print(f"Downloading {name} reviews ({sample_size:,} records)...")
    print(f"{'='*50}")

    dataset = load_dataset(
        "McAuley-Lab/Amazon-Reviews-2023",
        config_name,
        split="full",
        streaming=True,
        trust_remote_code=True,
        ignore_verifications=True,
    )

    samples = []
    skipped = 0

    for i, item in enumerate(dataset):
        if len(samples) >= sample_size:
            break

        if i > 0 and i % 1000 == 0:
            print(f"  Processed {i:,} → kept {len(samples):,} → skipped {skipped:,}", end='\r')

        if item.get("text") and len(item["text"]) > 50:
            samples.append({
                "user_id": item.get("user_id"),
                "asin": item.get("parent_asin"),
                "rating": item.get("rating"),
                "text": item.get("text"),
                "title": item.get("title"),
                "verified_purchase": item.get("verified_purchase"),
                "timestamp": item.get("timestamp"),
            })
        else:
            skipped += 1

    output_path = f"data/raw/{name}_reviews.jsonl"
    with open(output_path, "w") as f:
        for s in samples:
            f.write(json.dumps(s) + "\n")

    actual_size = os.path.getsize(output_path)
    print(f"\n  ✓ Saved {len(samples):,} reviews → {format_size(actual_size)}")
    return actual_size

def sample_meta(name, config_name, sample_size):
    print(f"\n{'='*50}")
    print(f"Downloading {name} metadata ({sample_size:,} records)...")
    print(f"{'='*50}")

    dataset = load_dataset(
        "McAuley-Lab/Amazon-Reviews-2023",
        config_name,
        split="full",
        streaming=True,
        trust_remote_code=True,
        ignore_verifications=True,
    )

    samples = []
    skipped = 0

    for i, item in enumerate(dataset):
        if len(samples) >= sample_size:
            break

        if i > 0 and i % 500 == 0:
            print(f"  Processed {i:,} → kept {len(samples):,} → skipped {skipped:,}", end='\r')

        if item.get("title") and item.get("description"):
            samples.append({
                "parent_asin": item.get("parent_asin"),
                "title": item.get("title"),
                "description": item.get("description"),
                "features": item.get("features", []),
                "main_category": item.get("main_category"),
                "average_rating": item.get("average_rating"),
                "rating_number": item.get("rating_number"),
                "price": item.get("price"),
                "store": item.get("store"),
            })
        else:
            skipped += 1

    output_path = f"data/raw/{name}_meta.jsonl"
    with open(output_path, "w") as f:
        for s in samples:
            f.write(json.dumps(s) + "\n")

    actual_size = os.path.getsize(output_path)
    print(f"\n  ✓ Saved {len(samples):,} meta records → {format_size(actual_size)}")
    return actual_size

# ─── Size estimate ────────────────────────────────────────────────────────────

print("\n📦 ESTIMATED DOWNLOAD SIZES")
print("─" * 45)
total_estimate = 0
for cat in CATEGORIES:
    cat_total = cat["estimated_review_mb"] + cat["estimated_meta_mb"]
    total_estimate += cat_total
    print(f"  {cat['name']}")
    print(f"    Reviews  ({cat['review_sample']:,} records): ~{cat['estimated_review_mb']} MB")
    print(f"    Metadata ({cat['meta_sample']:,} records):  ~{cat['estimated_meta_mb']} MB")
    print(f"    Subtotal:                    ~{cat_total} MB")
    print()
print(f"  TOTAL ESTIMATED:               ~{total_estimate} MB")
print("─" * 45)
print("\nStarting downloads...\n")

# ─── Run ──────────────────────────────────────────────────────────────────────

total_actual = 0
for cat in CATEGORIES:
    total_actual += sample_reviews(cat["name"], cat["review_config"], cat["review_sample"])
    total_actual += sample_meta(cat["name"], cat["meta_config"], cat["meta_sample"])

# ─── Summary ──────────────────────────────────────────────────────────────────

print(f"\n{'='*50}")
print("✅ ALL DOWNLOADS COMPLETE")
print(f"{'='*50}")
print(f"  Total data on disk: {format_size(total_actual)}")
print(f"\n  Files created:")
for cat in CATEGORIES:
    print(f"    data/raw/{cat['name']}_reviews.jsonl")
    print(f"    data/raw/{cat['name']}_meta.jsonl")
print(f"\n  Next step: run upsertProducts.js to push to Pinecone")