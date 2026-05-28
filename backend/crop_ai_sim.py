import os
import json
import random
from PIL import Image
from openai import OpenAI

# 1. Initialize OpenAI Client (using latest SDK pattern)
# Ensure you have OPENAI_API_KEY set in your environment variables
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "YOUR_API_KEY_HERE"))

def analyze_crop_image(image_path):
    """
    Simulates a crop analysis function.
    No CNN/ML training needed - uses image metadata for variance.
    """
    if not os.path.exists(image_path):
        return {"error": "Image file not found"}

    # Bonus: Use file size as a seed to vary output slightly
    file_size = os.path.getsize(image_path)
    random.seed(file_size)

    # Randomly decide status
    status = random.choice(["Healthy", "Damaged"])
    damage_pct = 0

    if status == "Damaged":
        # Generate random damage percentage between 10-90%
        damage_pct = random.randint(10, 90)

    result = {
        "status": status,
        "damage": damage_pct
    }

    return result

def get_ai_advice(status, damage):
    """
    Calls OpenAI to get simple advice based on the crop status.
    """
    prompt = f"Crop is {status}."
    if status == "Damaged":
        prompt = f"Crop is {damage}% damaged."
    
    prompt += " Give simple advice to the farmer in exactly 2 lines."

    try:
        # Using the standard Chat Completion pattern from the latest SDK
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # or "gpt-4o"
            messages=[
                {"role": "system", "content": "You are a helpful agricultural assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=60
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"AI Advice unavailable: {str(e)}"

def main(image_path):
    """
    One main function to run the whole detection system.
    """
    print(f"\n--- Crop Damage Detection System ---")
    print(f"Reading image: {os.path.basename(image_path)}")

    # 1. Run simulated analysis
    analysis = analyze_crop_image(image_path)
    
    if "error" in analysis:
        print(f"Error: {analysis['error']}")
        return

    status = analysis["status"]
    damage = analysis["damage"]

    # 2. Get OpenAI Advice
    print("Fetching AI-generated advice...")
    advice = get_ai_advice(status, damage)

    # 3. Display Results
    print("\n" + "="*30)
    print(f"Status:   {status}")
    if status == "Damaged":
        print(f"Damage:   {damage}%")
    print("-" * 30)
    print(f"AI Advice:\n{advice}")
    print("="*30 + "\n")

    # Output as JSON (as requested for internal logic)
    json_output = json.dumps(analysis, indent=2)
    # print(f"Raw Analysis: {json_output}")

if __name__ == "__main__":
    # Example usage with one of the test images in the project
    test_image = "Test1.png" 
    if os.path.exists(test_image):
        main(test_image)
    else:
        print(f"Please provide a valid image path. '{test_image}' not found.")
