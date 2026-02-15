import logging

from app.core.celery_app import celery_app
from app.worker.docker_service import docker_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="run_oi_agent")
def run_oi_agent(self, container_id: str, prompt: str, gemini_api_key: str):
    logger.info(f"Starting Open Interpreter via Python SDK in {container_id}")

    # Екрануємо одинарні лапки для Python-рядка
    safe_prompt = prompt.replace("'", "\\'")

    python_logic = (
        "import os; "
        f"os.environ['GEMINI_API_KEY']='{gemini_api_key}'; "
        "from interpreter import interpreter; "
        "interpreter.llm.model='gemini/gemini-3.0-flash'; "
        "interpreter.auto_run=True; "
        f"interpreter.chat('{safe_prompt}')"
    )

    # Огортаємо в команду запуску
    oi_cmd = f'python3 -c "{python_logic}"'

    try:
        # Важливо: запускаємо від kasm-user, щоб він мав права на Desktop
        output = docker_service.execute_command(container_id, oi_cmd, user="kasm-user")
        logger.info(f"OI Output:\n{output}")
        return {"status": "success", "output": output}
    except Exception as e:
        logger.error(f"Task failed: {e}")
        return {"status": "error", "error": str(e)}