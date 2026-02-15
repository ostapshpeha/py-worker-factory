import base64
import logging
import os

from app.core.celery_app import celery_app
from app.worker.docker_service import docker_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="run_oi_agent")
def run_oi_agent(self, container_id: str, gemini_api_key: str):
    logger.info(f"⚙️ Ініціалізація та перевірка зв'язку для {container_id}")

    # Створюємо папку для агента (якщо її немає) і робимо тестовий запит
    python_logic = (
        "import os; "
        "os.makedirs('/home/kasm-user/agent', exist_ok=True); "
        f"os.environ['GEMINI_API_KEY']='{gemini_api_key}'; "
        "from interpreter import interpreter; "
        "interpreter.llm.model='gemini/gemini-2.0-flash'; "
        "interpreter.auto_run=True; "
        "interpreter.chat('System check: say Ready'); "
    )

    oi_cmd = f'python3 -c "{python_logic}"'
    docker_service.execute_command(container_id, oi_cmd, user="kasm-user")

    return {"status": "initialized"}


@celery_app.task(bind=True, name="execute_worker_task")
def execute_worker_task(self, task_id: int, worker_id: int, container_id: str, prompt: str, gemini_api_key: str):
    logger.info(f"▶️ Executing task {task_id} via Base64 Injection")

    python_script = f"""
import os, json, sys
from interpreter import interpreter

os.environ['GEMINI_API_KEY'] = '{gemini_api_key}'
interpreter.llm.model = 'gemini/gemini-2.0-flash'
interpreter.auto_run = True
interpreter.llm.context_window = 1000000
interpreter.offline = True

history_file = '/home/kasm-user/agent/history.json'

try:
    if os.path.exists(history_file):
        with open(history_file, 'r') as f:
            interpreter.messages = json.load(f)

    interpreter.chat('{prompt.replace("'", "\\'")}')

    with open(history_file, 'w') as f:
        json.dump(interpreter.messages, f)
except Exception as e:
    print(f"INTERNAL_ERROR: {{e}}")
    sys.exit(1)
    """

    encoded_script = base64.b64encode(python_script.encode('utf-8')).decode('utf-8')

    # Команда для запуску: декодуємо та виконуємо прямо в пам'яті
    run_cmd = f"python3 -c \"import base64; exec(base64.b64decode('{encoded_script}').decode('utf-8'))\""

    try:
        # Виконуємо в контейнері
        output = docker_service.execute_command(container_id, run_cmd, user="kasm-user")

        #TODO ТУТ МАЄ БУТИ ОНОВЛЕННЯ БД (Синхронне)
        # db = SessionLocal()
        # update_task_status(db, task_id, "COMPLETED", output)
        # update_worker_status(db, worker_id, "IDLE")
        # db.close()

        logger.info(f"✅ Task {task_id} completed successfully")
        return {"status": "success", "output": output}

    except Exception as e:
        logger.error(f"❌ Task {task_id} failed: {str(e)}")
        #TODO Оновити статус на FAILED і воркера на IDLE
        return {"status": "error", "error": str(e)}