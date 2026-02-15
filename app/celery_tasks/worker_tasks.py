import logging
import os

from app.core.celery_app import celery_app
from app.worker.docker_service import docker_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="run_oi_agent")
def run_oi_agent(self, container_id: str, prompt: str, gemini_api_key: str):
    logger.info(f"Starting Open Interpreter directly in memory for {container_id}")

    # Екрануємо одинарні лапки для безпечної передачі
    safe_prompt = prompt.replace("'", "\\'")

    # 1. МАГІЯ ТУТ: Ніяких файлів. Усе виконується в один рядок.
    # 2. КРИТИЧНО: import os і запис ключа йдуть ПЕРЕД from interpreter import interpreter
    python_logic = (
        "import os; "
        # 1. Вказуємо ключ саме так, як хоче LiteLLM
        f"os.environ['GEMINI_API_KEY']='{gemini_api_key}'; "
        "from interpreter import interpreter; "
        # 2. ПРЕФІКС 'gemini/' обов'язковий, щоб обійти Vertex AI
        "interpreter.llm.model='gemini/gemini-2.0-flash'; "
        "interpreter.auto_run=True; "
        # 3. Вимикаємо перевірку контекстного вікна (щоб не було зайвих логів)
        "interpreter.llm.context_window=1000000; "
        f"interpreter.chat('{safe_prompt}')"
    )

    # Огортаємо скрипт у команду запуску
    oi_cmd = f'python3 -c "{python_logic}"'

    try:
        # Запускаємо процес безпосередньо в консолі Ubuntu від звичайного юзера
        output = docker_service.execute_command(container_id, oi_cmd, user="kasm-user")
        logger.info(f"OI Response Summary:\n{output[-500:]}")
        return {"status": "success", "output": output}
    except Exception as e:
        logger.error(f"Task failed: {e}")
        return {"status": "error", "error": str(e)}