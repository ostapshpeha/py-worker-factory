import base64
import logging
import os

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.worker import TaskModel, WorkerModel, WorkerStatus, TaskStatus
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
"interpreter.llm.model='gemini/gemini-2.5-flash'; "
"interpreter.auto_run=True; "
"interpreter.chat('System check: say Ready'); "
    )
    fix_sudo_cmd = "sh -c 'echo \"kasm-user ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers'"
    try:
        docker_service.execute_command(container_id, fix_sudo_cmd, user="root")
        logger.info("✅ Права sudo налаштовані!")
    except Exception as e:
        logger.error(f"❌ Не вдалося налаштувати sudo: {e}")
    oi_cmd = f'python3 -c "{python_logic}"'
    docker_service.execute_command(container_id, oi_cmd, user="kasm-user")

    return {"status": "initialized"}


@celery_app.task(bind=True, name="execute_worker_task")
def execute_worker_task(self, task_id: int, worker_id: int, container_id: str, prompt: str, gemini_api_key: str):
    logger.info(f"▶️ Executing task {task_id} via Base64 Injection")
    status_check = docker_service.execute_command(container_id, "whoami", user="kasm-user")
    logger.info(f"🔍 Container user check: {status_check}")

    # Формуємо Python-скрипт з ін'єкцією скілів та жорсткими правилами системи
    python_script = f"""
print("--- [DEBUG] Python script started inside container ---")
import os, json, sys, glob
from interpreter import interpreter

os.environ['GEMINI_API_KEY'] = '{gemini_api_key}'
interpreter.llm.model = 'gemini/gemini-2.5-flash'
interpreter.auto_run = True
interpreter.llm.context_window = 1000000

skills_dir = '/home/kasm-user/agent/skills'

interpreter.system_message += "\\nCRITICAL RULES:\\n"
interpreter.system_message += "- To install packages, ALWAYS use 'sudo apt-get install -y <package>'. Never forget the '-y' flag.\\n"
interpreter.system_message += "- Never wait for user input in terminal. Use non-interactive commands.\\n"

# 2. ІН'ЄКЦІЯ СКІЛІВ
if os.path.exists(skills_dir):
    for skill_file in glob.glob(os.path.join(skills_dir, '*.md')):
        try:
            with open(skill_file, 'r', encoding='utf-8') as sf:
                skill_content = sf.read()
                interpreter.system_message += "\\n--- SKILL DEFINITION (" + os.path.basename(skill_file) + ") ---\\n" + skill_content + "\\n"
        except Exception as e:
            print("Warning: Failed to load skill " + skill_file + ": " + str(e))

# 3. ВИКОНАННЯ (БЕЗ ФАЙЛОВОЇ ІСТОРІЇ)
try:
    # Виконуємо запит користувача
    interpreter.chat('{prompt.replace("'", "\\'")}')

    # ВИВІД РЕЗУЛЬТАТУ: Друкуємо останнє повідомлення агента
    if interpreter.messages:
        # Беремо останнє повідомлення, щоб Celery міг його витягнути з логів
        last_msg = interpreter.messages[-1].get("content", "No content")
        print(f"\\n===AGENT_FINAL_REPLY==\\n{{last_msg}}")

except Exception as e:
    print(f"\\n===INTERNAL_ERROR===\\n{{e}}")
    sys.exit(1)
"""

    encoded_script = base64.b64encode(python_script.encode('utf-8')).decode('utf-8')
    run_cmd = f"python3 -c \"import base64; exec(base64.b64decode('{encoded_script}').decode('utf-8'))\""

    db = SessionLocal()  # Відкриваємо синхронну сесію
    try:
        logger.info(f"🛠 Running command: {run_cmd[:100]}...")
        # Виконуємо в контейнері
        output = docker_service.execute_command(container_id, run_cmd, user="kasm-user")

        # Парсимо вивід, щоб дістати чисту відповідь агента або помилку
        final_result = output
        if "===AGENT_FINAL_REPLY===" in output:
            final_result = output.split("===AGENT_FINAL_REPLY===")[-1].strip()
        elif "===INTERNAL_ERROR===" in output:
            error_msg = output.split("===INTERNAL_ERROR===")[-1].strip()
            raise Exception(f"Agent crashed internally: {error_msg}")

        # ОНОВЛЕННЯ БД (Синхронне)
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()

        if task:
            task.status = TaskStatus.COMPLETED
            task.result = final_result  # Зберігаємо фінальну відповідь агента
        if worker:
            worker.status = WorkerStatus.IDLE

        db.commit()

        logger.info(f"✅ Task {task_id} completed successfully")
        return {"status": "success", "output": final_result}

    except Exception as e:
        logger.error(f"❌ Task {task_id} failed: {str(e)}")

        # ОНОВЛЕННЯ БД НА FAILED
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()

        if task:
            task.status = TaskStatus.FAILED
            task.result = str(e)
        if worker:
            worker.status = WorkerStatus.IDLE

        db.commit()
        return {"status": "error", "error": str(e)}

    finally:
        db.close()