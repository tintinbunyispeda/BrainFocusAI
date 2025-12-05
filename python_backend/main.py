import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from tensorflow.keras import layers, Model
import numpy as np
import cv2
import io
import os
from PIL import Image
from supabase import create_client, Client

# --- KONFIGURASI SUPABASE (HARDCODED) ---
SUPABASE_URL = "https://mcpxlcjzhcucbegczxhc.supabase.co"
SUPABASE_KEY = "sb_publishable_H-tcN-8iZ3m24JH0unGcag_morQW45T"

# Inisialisasi Client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[INFO] Sukses koneksi ke Supabase.")
except Exception as e:
    print(f"[ERROR] Gagal koneksi Supabase: {e}")
    supabase = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FUNGSI BANTUAN (LIVENESS & PREPROCESS) ---

def check_blur_score(image_array):
    """
    Menghitung tingkat ketajaman gambar menggunakan Laplacian Variance.
    Score rendah (< 30-50) biasanya indikasi foto buram (layar HP/kertas).
    """
    try:
        # Convert ke Grayscale (Hitam Putih)
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        # Hitung variansi Laplacian
        score = cv2.Laplacian(gray, cv2.CV_64F).var()
        return score
    except Exception:
        return 0.0

def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image = np.array(image)
    img = cv2.resize(image, (160, 160))
    img = img.astype("float32") / 255.0
    return np.expand_dims(img, 0)

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# --- MODEL ARCHITECTURE ---
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

model = None
local_cache = {}

# --- SYNC DATABASE SAAT START ---
def refresh_local_cache():
    global local_cache
    if not supabase:
        print("[WARNING] Supabase offline. Menggunakan cache kosong.")
        return

    try:
        # Ambil semua data user_faces dari Supabase
        response = supabase.table('user_faces').select("*").execute()
        data = response.data
        
        local_cache = {}
        for row in data:
            name = row['name']
            embedding = row['embedding']
            
            if name not in local_cache:
                local_cache[name] = []
            local_cache[name].append(embedding)
            
        print(f"[OK] Database tersinkronisasi: {len(data)} user dimuat dari Cloud.")
    except Exception as e:
        print(f"[ERROR] Gagal download data dari Supabase: {e}")

# --- LOAD RESOURCES ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.h5")

if os.path.exists(ENCODER_PATH):
    try:
        model = build_mini_facenet()
        model.load_weights(ENCODER_PATH)
        print("[OK] Model AI berhasil dimuat.")
    except Exception as e:
        print(f"[ERROR] Model error: {e}")
else:
    print(f"[CRITICAL] File encoder.h5 tidak ditemukan di: {ENCODER_PATH}")

refresh_local_cache()

# --- ENDPOINTS ---

@app.post("/register")
async def register_face(name: str = Form(...), file: UploadFile = File(...)):
    if model is None:
        return {"status": "error", "message": "Model AI belum siap"}
    
    try:
        # 1. Baca File
        content = await file.read()
        
        # 2. Proses AI
        img_batch = preprocess_image(content)
        embedding = model.predict(img_batch, verbose=0)[0]
        embedding_list = [round(float(x), 4) for x in embedding.tolist()]
        
        # 3. Simpan ke Supabase (CLOUD)
        if supabase:
            try:
                data_insert = {
                    "name": name,
                    "embedding": embedding_list
                }
                supabase.table('user_faces').insert(data_insert).execute()
                print(f"[CLOUD] Berhasil upload user baru: {name}")
            except Exception as e_supa:
                print(f"[CLOUD ERROR] Gagal simpan ke Supabase: {e_supa}")
        
        # 4. Simpan ke Cache Lokal (RAM)
        if name not in local_cache:
            local_cache[name] = []
        local_cache[name].append(embedding_list)
            
        print(f"[LOCAL] User {name} aktif di sesi ini.")
        return {"status": "success", "message": f"User {name} berhasil didaftarkan"}
        
    except Exception as e:
        print(f"[ERROR] Register error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/verify")
async def verify_face(file: UploadFile = File(...)):
    if model is None:
        return {"match": False, "name": "Error", "error": "Model not loaded"}

    try:
        # 1. Baca Konten File Sekali Saja
        content = await file.read()

        # --- TAHAP 1: CEK NO-AI LIVENESS (BLUR DETECTION) ---
        # Decode gambar untuk OpenCV
        nparr = np.frombuffer(content, np.uint8)
        img_cv2 = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv2 is not None:
            blur_score = check_blur_score(img_cv2)
            print(f"🔍 Blur Score: {blur_score:.2f}")

            # Threshold Score (30 adalah angka toleransi untuk webcam laptop)
            # Di bawah 30 dianggap terlalu buram/mencurigakan
            MIN_SHARPNESS = 30

            if blur_score < MIN_SHARPNESS:
                print(f"🚨 SPOOF SUSPECTED: Score {blur_score:.2f} terlalu rendah.")
                return {
                    "match": False,
                    "name": "Spoof Suspected",
                    "error": "Image is too blurry or suspicious."
                }
        else:
            print("⚠️ Gagal decode gambar untuk blur check, skip step ini.")

        # --- TAHAP 2: CEK PENGENALAN WAJAH (FACENET) ---
        img_batch = preprocess_image(content)
        current_embedding = model.predict(img_batch, verbose=0)[0]

        best_name = "Unknown"
        best_score = -1.0

        # Cek database di RAM
        for name, vectors in local_cache.items():
            for vec in vectors:
                score = cosine_similarity(current_embedding, np.array(vec))
                if score > best_score:
                    best_score = score
                    best_name = name
        
        THRESHOLD = 0.75
        is_match = best_score > THRESHOLD
        
        print(f"[SCAN] Hasil: {best_name} | Score: {best_score:.4f}")

        return {
            "match": bool(is_match),
            "name": str(best_name),
            "score": float(best_score)
        }

    except Exception as e:
        print(f"[ERROR] Verify error: {e}")
        return {"match": False, "name": "Error", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)