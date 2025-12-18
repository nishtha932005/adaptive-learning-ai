import google.generativeai as genai

# ==========================================
# 👇 PASTE YOUR API KEY INSIDE THE QUOTES 👇
# ==========================================
MY_API_KEY = "AIzaSyBx5aUul7-p5ADAVau42Ww1XI0LIKr9E1M"

print(f"🔑 Authenticating with key: {MY_API_KEY[:5]}...*******")

try:
    genai.configure(api_key=MY_API_KEY)

    print("\n✅ SUCCESS: API Key is valid.")
    print("📋 Here are the models you can use:\n")
    
    found_any = False
    for m in genai.list_models():
        # We only care about models that can generate text/chat
        if 'generateContent' in m.supported_generation_methods:
            print(f"   👉 {m.name}")
            found_any = True
            
    if not found_any:
        print("⚠️ No text-generation models found. This is unusual.")
        
    print("\n💡 ACTION STEP: Copy one of the names above (e.g., 'models/gemini-1.5-flash')")
    print("   and paste it into 'backend/app/services/gemini.py'")

except Exception as e:
    print(f"\n❌ ERROR: Your API Key is likely invalid.\nDetails: {e}")