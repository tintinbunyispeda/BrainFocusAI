import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from tensorflow.keras import layers, Model
import numpy as np
import cv2
import json
import io
import os
from PIL import Image

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. MODEL ARCHITECTURE ---
def build_mini_facenet(input_shape=(160, 160, 3), embedding_size=128):
    inp = layers.Input(shape=input_shape)
    x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(inp)
    x = layers.MaxPooling2D()(x)
    x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(x)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(embedding_size)(x)
    x = layers.Lambda(lambda t: tf.nn.l2_normalize(t, axis=1), name="normalization_layer")(x)
    return Model(inp, x, name="MiniFaceNet")

# --- 2. LOAD RESOURCES ---
model = None
database = {}
DB_FILE = "face_database.json"

if os.path.exists("encoder.h5"):
    try:
        model = build_mini_facenet()
        model.load_weights("encoder.h5")
        print("✅ Model loaded.")
    except Exception as e:
        print(f"❌ Model error: {e}")

if os.path.exists(DB_FILE):
    try:
        with open(DB_FILE, "r") as f:
            database = json.load(f)
        print(f"✅ Database loaded: {len(database)} users.")
    except:
        print("⚠️ Database reset/empty.")

def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image = np.array(image)
    img = cv2.resize(image, (160, 160))
    img = img.astype("float32") / 255.0
    return np.expand_dims(img, 0)

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# --- 3. ENDPOINTS ---

@app.post("/register")
async def register_face(name: str = Form(...), file: UploadFile = File(...)):
    if model is None:
        return {"status": "error", "message": "Model not loaded"}
    
    try:
        # 1. Proses Gambar
        content = await file.read()
        img_batch = preprocess_image(content)
        
        # 2. Buat Embedding
        embedding = model.predict(img_batch, verbose=0)[0]
        
        # 3. Simpan ke Database Memory
        if name not in database:
            database[name] = []
        
        # Simpan vektor sebagai list biasa (bukan numpy)
        database[name].append(embedding.tolist())
        
        # 4. Simpan ke File JSON (Agar permanen)
        with open(DB_FILE, "w") as f:
            json.dump(database, f)
            
        print(f"🆕 User registered: {name}")
        return {"status": "success", "message": f"User {name} registered"}
        
    except Exception as e:
        print(f"❌ Register error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/verify")
async def verify_face(file: UploadFile = File(...)):
    if model is None:
        return {"match": False, "name": "Error", "error": "Model not loaded"}

    try:
        content = await file.read()
        img_batch = preprocess_image(content)
        current_embedding = model.predict(img_batch, verbose=0)[0]

        best_name = "Unknown"
        best_score = -1.0

        for name, vectors in database.items():
            for vec in vectors:
                score = cosine_similarity(current_embedding, np.array(vec))
                if score > best_score:
                    best_score = score
                    best_name = name
        
        # Threshold
        THRESHOLD = 0.55
        is_match = best_score > THRESHOLD
        
        print(f"🔍 Scan: {best_name} | Score: {best_score:.4f}")

        return {
            "match": bool(is_match),
            "name": str(best_name),
            "score": float(best_score)
        }

    except Exception as e:
        print(f"❌ Verify error: {e}")
        return {"match": False, "name": "Error", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)