# Use AWS Lambda Python 3.11 base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy application code into src/ subdirectory
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Add LAMBDA_TASK_ROOT to Python path so "src.module" imports work
ENV PYTHONPATH="${LAMBDA_TASK_ROOT}:${PYTHONPATH}"

# Set the Lambda handler
CMD ["src.lambda_handler.handler"]
