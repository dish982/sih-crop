import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"



from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin (e.g. http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load Class Names
with open("class_names.json", "r") as f:
    class_names = json.load(f)

# 2. Reconstruct Model Architecture
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.mobilenet_v3_small(weights=None)
model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(class_names))

# 3. Load Trained Weights (.pt file)
model.load_state_dict(torch.load("tomato_disease_model.pt", map_location=device))
model.to(device)
model.eval()

# 4. Image Preprocessing Pipeline
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        
        # Get Top 3 predictions
        top_probs, top_indices = torch.topk(probabilities, 3)
        
    results = []
    for prob, idx in zip(top_probs, top_indices):
        results.append({
            "class": class_names[idx.item()],
            "confidence": round(prob.item() * 100, 2)
        })

    # Return top 1 main result + alternatives
    return {
        "prediction": results[0]["class"],
        "confidence": results[0]["confidence"],
        "alternatives": results[1:]
    }