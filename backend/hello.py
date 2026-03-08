print("Hello World")
import google.generativeai as genai

genai.configure(api_key="AIzaSyBzSKklgQE3a6rb34iswonkAFTlhI9C_xA")

for m in genai.list_models():
    print(m.name)