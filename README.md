# 📦 Boundify – Annotation Tool for Computer Vision Datasets

Boundify is a lightweight, fast, and flexible annotation tool designed to simplify dataset labeling for **any type of computer vision task**.  
While it was originally created for detecting **7-segment industrial LED displays** (amp meters, volt meters, counters), the tool is fully general-purpose and can be used to annotate **any kind of image dataset**.

Boundify combines **YOLOv8 model-assisted auto-annotation**, **manual correction**, and optional **Roboflow API integration** to dramatically speed up dataset creation and continuously improve model performance.


![Demo](https://github.com/MojtabaZarreh/Boundify/blob/main/demo/demo.gif)


---

## ⭐ How the Idea Started

This project started during the development of an industrial computer-vision system in a LECA factory.  
We trained a YOLOv8 model to read 7-segment LED digits from several cameras. The initial model worked well, but as **new cameras** were added, we faced major challenges:

- The dataset needed **constant expansion**
- Manual labeling became **slow and repetitive**
- Frequent retraining was required to maintain accuracy

To solve this, Boundify was created 
a tool that uses your **already-trained model** to predict bounding boxes automatically, so you only review and correct them instead of starting from scratch.

Although the project began with 7-segment displays, the tool quickly evolved into a **general annotation platform** usable for any object detection dataset.

Boundify was also developed using **AI-assisted coding**, which helped speed up development and experimentation.

---

## 🚀 Features

### 🔹 Model-Assisted Auto Annotation
Use your existing **YOLOv8 model** to automatically generate bounding boxes on any image type.

### 🔹 Manual Annotation & Editing
- Create, adjust, or remove bounding boxes  
- Supports any custom class names  
- Smooth UI designed for fast and efficient labeling

### 🔹 Supports Any Image Dataset  
Although originally built for 7-segment digits, Boundify can annotate:
- Industrial cameras  
- General object detection datasets  
- Custom datasets for AI research  
- Multi-class and multi-object scenes  

### 🔹 Smart Fallback for Hard Cases
If the model fails or is uncertain:
- Manually label the image  
- Low-confidence predictions are highlighted

### 🔹 Optional Roboflow Integration
Send images to **Roboflow Annotate API** and automatically import their annotations.

### 🔹 Built for Continual Dataset Growth
Perfect for environments where new data is continuously added and the model needs ongoing improvement.

### 🔹 Fully Dockerized
Easily build and run anywhere:

```bash
docker build -f docker/dockerfile -t boundify .
docker run -p 9000:9000 boundify


