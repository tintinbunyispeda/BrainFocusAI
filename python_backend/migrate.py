import json
import os
from supabase import create_client

# --- KONFIGURASI SUPABASE ---
SUPABASE_URL = "https://mcpxlcjzhcucbegczxhc.supabase.co"
SUPABASE_KEY = "sb_publishable_H-tcN-8iZ3m24JH0unGcag_morQW45T"

# --- SETUP PATH OTOMATIS ---
# Ini agar script tahu file ada di folder 'python_backend', bukan folder luar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, "face_database.json")

# Inisialisasi Client
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[OK] Berhasil koneksi ke Supabase client.")
except Exception as e:
    print(f"[ERROR] Gagal inisialisasi Supabase: {e}")
    exit()

def migrate():
    # 1. Cek File
    if not os.path.exists(JSON_FILE):
        print(f"[ERROR] File database tidak ditemukan di: {JSON_FILE}")
        print("Pastikan nama file benar: face_database.json")
        return

    try:
        with open(JSON_FILE, "r") as f:
            data = json.load(f)
        print(f"[INFO] Berhasil membaca database. Ditemukan {len(data)} user.")
    except Exception as e:
        print(f"[ERROR] Gagal membaca file JSON: {e}")
        return

    # 2. Upload Data
    success_count = 0
    fail_count = 0

    print("\n--- Mulai Upload ---")

    for name, vectors in data.items():
        if not isinstance(vectors, list):
            continue

        for i, vec in enumerate(vectors):
            payload = {
                "name": name,
                "embedding": vec
            }
            try:
                supabase.table('user_faces').insert(payload).execute()
                print(f"[OK] Uploaded: {name} (Vektor #{i+1})")
                success_count += 1
            except Exception as e:
                print(f"[FAIL] Gagal upload {name}: {e}")
                fail_count += 1

    print("\n" + "="*30)
    print(f"MIGRASI SELESAI")
    print(f"Sukses: {success_count}")
    print(f"Gagal : {fail_count}")
    print("="*30)

if __name__ == "__main__":
    migrate()