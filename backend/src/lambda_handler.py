# Lambda entry point for API Gateway → Flask via Mangum WSGI adapter.
# The `handler` function is referenced as the container CMD / Lambda handler.

from mangum import Mangum
from server import app

handler = Mangum(app)
