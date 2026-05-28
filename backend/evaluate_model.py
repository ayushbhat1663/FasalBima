import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

MODEL_PATH = 'crop_model.h5'
DATASET_DIR = 'dataset'
BATCH_SIZE = 16
IMG_SIZE = (224, 224)

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Saved model not found at: {MODEL_PATH}")

print(f"Loading saved model from: {MODEL_PATH}")
model = load_model(MODEL_PATH)
print("Model loaded successfully.")

if not os.path.isdir(DATASET_DIR):
    raise FileNotFoundError(f"Dataset directory not found at: {DATASET_DIR}")

val_datagen = ImageDataGenerator(rescale=1.0 / 255.0, validation_split=0.2)
val_data = val_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False,
    seed=42
)

print(f"Validation samples: {val_data.samples}")
print(f"Classes: {val_data.class_indices}")

print("\nEvaluating model on validation dataset...")
val_loss, val_accuracy = model.evaluate(val_data, verbose=1)
print(f"\nValidation Loss: {val_loss:.4f}")
print(f"Validation Accuracy: {val_accuracy:.4f}")

# Reset generator so predictions align with labels
val_data.reset()
predictions = model.predict(val_data, verbose=1)
predicted_classes = np.argmax(predictions, axis=1)
true_classes = val_data.classes
class_labels = list(val_data.class_indices.keys())

accuracy = accuracy_score(true_classes, predicted_classes)
precision = precision_score(true_classes, predicted_classes, average='weighted', zero_division=0)
recall = recall_score(true_classes, predicted_classes, average='weighted', zero_division=0)
f1 = f1_score(true_classes, predicted_classes, average='weighted', zero_division=0)
cm = confusion_matrix(true_classes, predicted_classes)

print("\n=== Validation Metrics ===")
print(f"Accuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1-score: {f1:.4f}")
print("\nConfusion Matrix:")
print(cm)
print("\nClassification Report:")
print(classification_report(true_classes, predicted_classes, target_names=class_labels, zero_division=0))

print("\nEvaluation complete.")
