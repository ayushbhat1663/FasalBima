import sys
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications import MobileNetV2
model = tf.keras.models.load_model('crop_model.h5')

img_path = sys.argv[1]

img = image.load_img(img_path, target_size=(224, 224))
img_array = image.img_to_array(img)
img_array = np.expand_dims(img_array, axis=0) / 255.0

prediction = model.predict(img_array, verbose=0)

classes = ["damaged", "healthy"]
print(classes[np.argmax(prediction)])