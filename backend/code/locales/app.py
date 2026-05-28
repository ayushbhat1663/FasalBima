from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({
        "message": "FasalBima AI Backend Running"
    })

@app.route("/predict-disaster", methods=["POST"])
def predict_disaster():

    data = request.json

    crop_name = data.get("crop_name", "Unknown")
    # Production-safe behavior: do not return random predictions.
    # Require a deterministic test_case in payload for local testing.
    test_case = data.get('test_case')
    if not test_case:
        return jsonify({
            "success": False,
            "message": "No AI model connected. Provide 'test_case' for deterministic responses or connect a real model."
        }), 400

    mapping = {
        'flood': ('Flood', 92.5),
        'drought': ('Drought', 85.0),
        'pest': ('Pest Attack', 78.4),
        'hail': ('Hailstorm', 88.1),
        'healthy': ('Healthy Crop', 98.0)
    }

    key = str(test_case).lower()
    if key in mapping:
        detected, confidence = mapping[key]
    else:
        return jsonify({"success": False, "message": "Unknown test_case"}), 400

    return jsonify({
        "success": True,
        "crop": crop_name,
        "detected_disaster": detected,
        "confidence_score": confidence
    })

if __name__ == "__main__":
    app.run(debug=True)