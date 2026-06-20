# BrainFocusAI — CalorieVision

**A Deep Learning Approach to Food Detection and Calorie Tracking for Students**

CalorieVision is an AI-powered web application that detects Indonesian food in real time through a webcam and estimates its caloric content. It is built around a YOLOv8 object detection model trained on a custom Indonesian-food dataset and served through a lightweight web interface, helping students and the general public make more informed dietary choices without manual logging.

---

## ✨ Features

- **Real-time food detection** via webcam using YOLOv8
- **Calorie estimation** based on user-supplied food weight (grams) and standard kcal-per-100g references
- **Interactive web app** with three main views: landing page, live detection interface, and calorie counter
- **20 Indonesian food classes** trained on 1,585 annotated images
- **Daily intake comparison** to help users contextualize their meals

---

## 🖼️ Demo

![CalorieVision detecting Pisang, Mie Ayam, and Es Teh with bounding boxes and calorie labels](images/detection_example.jpg)

The app draws bounding boxes around recognized foods (e.g., *Pisang*, *Mie Ayam*, *Es Teh*) and overlays an estimated calorie value for each item, plus a running total.

---

## 🧠 Methodology

![Project flowchart: Data Collection → Preprocessing → Model Training → Deployment → Web Application](images/flowchart.png)

1. **Data Collection** — Indonesian food images sourced from Roboflow and Google Images, then split into train / validation / test sets.
2. **Preprocessing** — Resize to YOLO input size, normalize pixel values, annotate bounding boxes, and apply augmentation (rotation, flipping, shearing, scaling, brightness/contrast, noise, blur) to improve generalization.
3. **Model Training** — Train and compare YOLOv8n and YOLOv11n over 20 epochs.
4. **Model Deployment** — Export the trained YOLOv8 weights and integrate with the web backend (FastAPI).
5. **Web Application** — Real-time webcam detection plus a calorie calculator.

---

## 📊 Model Comparison (YOLOv8n vs YOLOv11n)

| Model     | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 |
|-----------|-----------|--------|---------|--------------|
| YOLOv8n   | 79.1%     | 79.4%  | 83.8    | 51.2%        |
| YOLOv11n  | 81.9%     | 78.7%  | 83.8    | 55.1%        |

| YOLOv8n training metrics | YOLOv11n training metrics |
|--------------------------|---------------------------|
| ![YOLOv8n metrics vs epochs](images/yolov8n_metrics.jpg) | ![YOLOv11n metrics vs epochs](images/yolov11n_metrics.jpg) |

**Why YOLOv8 was selected for deployment:** although YOLOv11n produced a slightly higher mAP@0.5:0.95, its training curve fluctuated more. YOLOv8n was more stable and consistent across epochs, has wider third-party support, and integrates more smoothly with FastAPI for real-time webcam inference.

---

## 🧮 Calorie Estimation

Once a food item is detected, calories are computed from the user-supplied weight:

```
calories_kcal = (weight_in_grams / 100) * kcal_per_100g[food_class]
```

Each of the 20 food classes has a predetermined kcal-per-100g value taken from standard nutritional references.

---

## 🧱 Tech Stack

- **Model**: Ultralytics YOLOv8 (compared against YOLOv11)
- **Backend**: FastAPI (real-time inference endpoint)
- **Frontend**: Web UI with live webcam stream + calorie calculator
- **Dataset**: Roboflow (Indonesian food, 1,585 images, 20 classes)
- **Language**: Python

---

## 🚀 Getting Started

> Adjust the commands below to match the actual entry points in this repository.

```bash
# 1. Clone
git clone https://github.com/tintinbunyispeda/BrainFocusAI.git
cd BrainFocusAI

# 2. (Recommended) create a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the web app
uvicorn app:app --reload
# then open http://localhost:8000
```

The app exposes three pages: the **landing page**, the **real-time detection** view (allow webcam access), and the **calorie counter** (enter food weight in grams to compute kcal and compare against recommended daily intake).

---

## 📈 Results

- Both YOLOv8n and YOLOv11n reached **mAP@0.5 = 83.8%** on the Indonesian-food test set.
- YOLOv11n achieved a higher **mAP@0.5:0.95 (55.1%)** vs YOLOv8n (51.2%), indicating tighter localization.
- YOLOv8n was chosen for deployment thanks to its training stability and smoother integration with the web stack.
- End-to-end, the system performs real-time multi-object food detection and computes per-item and total calorie estimates from a live webcam feed.

---

## 🔭 Future Work

- Expand the dataset to cover more food types and regional dishes
- Add food-intake history and personalized recommendations
- Improve portion-size estimation so users don't need to enter weight manually
- Further optimize real-time inference latency

---

## 👥 Authors

Faculty of Computer Science, **President University**, Bekasi, West Java

- Cristine Valentina
- Nisrina Izza Nur Aisyah
- Cut Kheysa Sakbania
- Shanty
- Elmira Jacinda Wahid
- Deffa Rahadiyan

---

## 📚 Key References

1. Kumar, R. D., Julie, E. G., Robinson, Y. H., et al. *Recognition of food type and calorie estimation using neural network.* J. Supercomput. 77, 8172–8193 (2021). https://doi.org/10.1007/s11227-021-03622-w
2. Agarwal, R., Choudhury, T., Ahuja, N. J., & Sarkar, T. *Hybrid Deep Learning Algorithm-Based Food Recognition and Calorie Estimation.* J. Food Process. Preserv., 2023. doi:10.1155/2023/6612302
3. Utami, G. C., Widiawati, C. R. A., & Subarkah, P. *Detection of Indonesian Food to Estimate Nutritional Information Using YOLOv5.* TEKNIKA 12(2), 158–165 (2023). doi:10.34148/teknika.v12i2.636
4. Wang, W., Liu, Q., & Zhang, L. *Nutritional composition analysis in food images: an innovative Swin Transformer approach.* Front. Nutr. 11, 1454466 (2024). doi:10.3389/fnut.2024.1454466
5. Abeltino, A., et al. *Digital applications for diet monitoring, planning, and precision nutrition.* Nutrition Reviews 83(2), e574–e601 (2025). doi:10.1093/nutrit/nuae035

A full reference list is available in the accompanying project report.

---

## 📝 License

Released under the MIT License — see `LICENSE` for details. (If a different license is preferred, update this section accordingly.)

---

_Cited from: "Deep Learning Approach to Food Detection and Calorie Tracking for Students", IT FOR SOCIETY, Vol. 09, No. 01, ISSN 2503-2224._
