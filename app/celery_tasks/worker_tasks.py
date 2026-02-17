import base64
import datetime
import logging
from datetime import datetime, timezone
from celery.exceptions import SoftTimeLimitExceeded

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.worker import TaskModel, WorkerModel, WorkerStatus, TaskStatus
from app.worker.docker_service import docker_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="run_oi_agent")
def run_oi_agent(self, container_id: str, gemini_api_key: str):
    logger.info(f"⚙️ Initialization container {container_id}")

    # 1. Даємо права sudo (від root)
    fix_sudo_cmd = "sh -c 'echo \"kasm-user ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers'"
    try:
        docker_service.execute_command(container_id, fix_sudo_cmd, user="root")
        logger.info("✅ Sudo is valid!")
    except Exception as e:
        logger.error(f"❌ Can't set sudo: {e}")

    # 2. Встановлюємо всі програми через bash (від kasm-user)
    # Використовуємо && щоб процес зупинився, якщо щось піде не так
    install_cmd = """bash -c "
        sudo apt update && 
        sudo apt install -y scrot w3m curl wget jq gedit nano pandoc texlive-base wkhtmltopdf csvkit sqlite3 plantuml tree fzf geany && 
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && 
        sudo apt install -y ./google-chrome-stable_current_amd64.deb && 
        rm ./google-chrome-stable_current_amd64.deb
    " """

    logger.info("📦 Installing packages...")
    docker_service.execute_command(container_id, install_cmd, user="kasm-user")


    python_logic = (
"import os; "
"os.makedirs('/home/kasm-user/agent', exist_ok=True); "
f"os.environ['GEMINI_API_KEY']='{gemini_api_key}'; "
"from interpreter import interpreter; "
"interpreter.llm.model='gemini/gemini-2.5-flash'; "
"interpreter.auto_run=True; "
"interpreter.chat('System check: say Ready');"
    )
    oi_cmd = f'python3 -c "{python_logic}"'
    docker_service.execute_command(container_id, oi_cmd, user="kasm-user")

    return {"status": "initialized"}


@celery_app.task(bind=True, name="execute_worker_task", soft_time_limit=500, time_limit=510)
def execute_worker_task(self, task_id: int, worker_id: int, container_id: str, prompt: str, gemini_api_key: str):
    logger.info(f"▶️ Executing task {task_id} via Base64 Injection")
    status_check = docker_service.execute_command(container_id, "whoami", user="kasm-user")
    logger.info(f"🔍 Container user check: {status_check}")

    # Python script injection
    python_script = f"""
import os, json, sys, glob
from interpreter import interpreter

os.environ['GEMINI_API_KEY'] = '{gemini_api_key}'
interpreter.llm.model = 'gemini/gemini-2.5-flash'
interpreter.auto_run = True
interpreter.llm.context_window = 1000000

skills_dir = '/home/kasm-user/agent/skills'

# 1. БАЗОВІ ПРАВИЛА
interpreter.system_message += "\\nCRITICAL RULES:\\n"
interpreter.system_message += "- You are an expert Ubuntu System Administrator running inside a Dockerized headless environment. Standard rules apply, but avoid commands that require systemd or snap.\\n"
interpreter.system_message += "- Never wait for user input in terminal. Use non-interactive commands.\\n"
interpreter.system_message += "- To run GUI apps like Chrome or VS Code, ALWAYS use '--no-sandbox --disable-dev-shm-usage' flags.\\n"

# 2. ПРАВИЛА ВИКОРИСТАННЯ СКІЛІВ (Магія для @)
interpreter.system_message += "\\nEXECUTOR MODE (MANDATORY):\\n"
interpreter.system_message += "- You are an autonomous executor, not a chat assistant.\\n"
interpreter.system_message += "- When a @skill is invoked, follow its steps to completion.\\n"
interpreter.system_message += "- Your final output for any task MUST be a concise summary of what was done and where the result is saved.\\n"
interpreter.system_message += "- DO NOT ask - Would you like me to do X? — just do it.\\n"

# 3. ІН'ЄКЦІЯ СКІЛІВ (Читаємо файли і формуємо правильні заголовки)
if os.path.exists(skills_dir):
    for skill_file in glob.glob(os.path.join(skills_dir, '*.md')):
        try:
            with open(skill_file, 'r', encoding='utf-8') as sf:
                skill_content = sf.read()
                # Витягуємо ім'я файлу без .md (наприклад, brainstorming)
                skill_name = os.path.basename(skill_file).replace('.md', '')
                
                # Формуємо заголовок, який LLM легко знайде по тегу @
                interpreter.system_message += "\\n--- SKILL DEFINITION (@" + skill_name + ") ---\\n" + skill_content + "\\n"
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

    db = SessionLocal()
    try:
        logger.info(f"🛠 Running command: {run_cmd[:100]}...")

        output = docker_service.execute_command(container_id, run_cmd, user="kasm-user")

        final_result = output
        if "===AGENT_FINAL_REPLY===" in output:
            final_result = output.split("===AGENT_FINAL_REPLY===")[-1].strip()
        elif "===INTERNAL_ERROR===" in output:
            error_msg = output.split("===INTERNAL_ERROR===")[-1].strip()
            raise Exception(f"Agent crashed internally: {error_msg}")

        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()

        if task:
            task.status = TaskStatus.COMPLETED
            task.logs = final_result
            task.finished_at = datetime.now(timezone.utc)
        if worker:
            worker.status = WorkerStatus.IDLE

        db.commit()

        logger.info(f"Task {task_id} completed successfully")
        return {"status": "success", "output": final_result}

    except SoftTimeLimitExceeded:
        logger.warning(f"Task {task_id} exceeded 5-minute time limit!")

        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()

        if task:
            task.status = TaskStatus.FAILED
            task.result = "Error: Task execution exceeded the 5-minute time limit."
            task.finished_at = datetime.now(timezone.utc)
        if worker:
            worker.status = WorkerStatus.IDLE

        db.commit()
        return {"status": "error", "error": "Timeout"}

    except Exception as e:
        logger.error(f"Task {task_id} failed: {str(e)}")

        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()

        if task:
            task.status = TaskStatus.FAILED
            task.result = str(e)
            task.finished_at = datetime.now(timezone.utc)
        if worker:
            worker.status = WorkerStatus.IDLE

        db.commit()
        return {"status": "error", "error": str(e)}

    finally:
        db.close()