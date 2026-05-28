import os
import cv2
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score

# Dataset path
DATASET_PATH = "Disaster_Dataset"

# Image size
IMG_SIZE = 64

# Store data
X = []
y = []

# Labels
categories = os.listdir(DATASET_PATH)

print("Loading dataset...")

# Read images
for category in categories:
    folder_path = os.path.join(DATASET_PATH, category)

    if not os.path.isdir(folder_path):
        continue

    for img_name in os.listdir(folder_path):
        img_path = os.path.join(folder_path, img_name)

        try:
            img = cv2.imread(img_path)
            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            X.append(img.flatten())
            y.append(category)

        except Exception as e:
            print(f"Error reading {img_path}: {e}")

# Convert to numpy arrays
X = np.array(X)
y = np.array(y)

print("Dataset loaded successfully")
print("Total samples:", len(X))

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training model...")

# Train model
model = SVC(kernel='linear')
model.fit(X_train, y_train)

print("Model training completed")

# Accuracy
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"\nModel Accuracy: {accuracy * 100:.2f}%")

# Test with one image
def predict_disaster(image_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    img = img.flatten().reshape(1, -1)

    prediction = model.predict(img)[0]

    return prediction

# Example prediction
test_image = input("\nEnter image path to test: ")

if os.path.exists(test_image):
    result = predict_disaster(test_image)
    print(f"\nDetected Disaster Type: {result}")
else:
    print("Image not found")