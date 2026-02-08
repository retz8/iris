# Lambda entry point for API Gateway → Flask via Mangum ASGI adapter.
# The `handler` function is referenced as the container CMD / Lambda handler.

from mangum import Mangum
from asgiref.wsgi import WsgiToAsgi
from src.server import app

# Wrap Flask (WSGI) with ASGI adapter, disable lifespan events (not supported by WsgiToAsgi)
asgi_app = WsgiToAsgi(app)
handler = Mangum(asgi_app, lifespan="   off")
