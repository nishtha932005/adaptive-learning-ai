import os

from google import genai

MY_API_KEY = os.getenv("GEMINI_API_KEY")

if not MY_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")

print(f"Authenticating with key prefix: {MY_API_KEY[:5]}...*******")

try:
    client = genai.Client(api_key=MY_API_KEY)

    print("\nSUCCESS: API key is valid.")
    print("Available models:\n")
    
    found_any = False
    for m in client.models.list():
        supported = getattr(m, "supported_actions", None) or getattr(m, "supported_generation_methods", None) or []
        supported_norm = {str(item).lower() for item in supported}
        if "generatecontent" in supported_norm or "generate_content" in supported_norm or "gemini" in getattr(m, "name", "").lower():
            print(f"   {getattr(m, 'name', '')}")
            found_any = True
            
    if not found_any:
        print("No text-generation models found.")
        
    print("\nUse one of the model names above in GEMINI_MODEL_ID if needed.")

except Exception as e:
    print(f"\nERROR: API key may be invalid.\nDetails: {e}")