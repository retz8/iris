import os
import sys


from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from src.parser.ast_parser import ASTParser
from src.routes import iris_bp

app = Flask(__name__, static_folder="static")

# Configure CORS to allow requests from GitHub and Chrome Extension
# Using resources parameter with origins for proper CORS handling
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://github.com/*",
            ],
            "allow_headers": ["Content-Type"],
            "methods": ["GET", "POST", "OPTIONS"],
        }
    },
)


# Register IRIS blueprint /api/iris
# from `src/iris_agent.routes`
app.register_blueprint(iris_bp)

ast_parser = ASTParser()


@app.route("/")
def index():
    return jsonify({"message": "Welcome to Iris Backend!"})


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})


@app.route("/static/<path:filename>")
def static_files(filename):
    """Serve static files"""
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), "static"), filename
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
