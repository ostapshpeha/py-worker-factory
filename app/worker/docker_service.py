# import docker
# import socket
# import logging
# from typing import Optional, Tuple
# from app.core.config import settings
#
# logger = logging.getLogger(__name__)
#
#
# class DockerService:
#     def __init__(self):
#         # Ініціалізація клієнта Docker.
#         # Він шукає сокет за замовчуванням (/var/run/docker.sock)
#         try:
#             self.client = docker.from_env()
#         except Exception as e:
#             logger.error(f"Failed to connect to Docker Daemon: {e}")
#             raise
#
#     def find_free_port(self, start_port: int = 6900, end_port: int = 7000) -> int:
#         """
#         Знаходить вільний порт на хост-машині для VNC-стріму.
#         """
#         for port in range(start_port, end_port):
#             with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
#                 # Намагаємось прив'язатися до порту. Якщо успішно - він вільний.
#                 res = sock.connect_ex(("localhost", port))
#                 if res != 0:
#                     return port
#         raise RuntimeError("No free ports available in range")
#
#     def create_kasm_worker(
#         self, worker_name: str, vnc_password: str
#     ) -> Tuple[str, int]:
#         """
#         Запускає контейнер KasmVNC.
#         Повертає: (container_id, mapped_port)
#         """
#         try:
#             # 1. Знаходимо вільний порт для веб-інтерфейсу
#             host_port = self.find_free_port()
#
#             # 2. Конфігурація змінних оточення для Kasm
#             env_vars = {
#                 "VNC_PW": vnc_password,
#                 "VNC_VIEW_ONLY": "false",
#                 "APP_ARGS": "--no-sandbox",  # Для Chromium
#             }
#
#             # 3. Запуск контейнера
#             container = self.client.containers.run(
#                 image="kasmweb/core-ubuntu-focal:1.16.0",  # Стабільна версія
#                 name=worker_name,
#                 detach=True,
#                 ports={"6901/tcp": host_port},  # 6901 - стандартний порт Kasm HTTPS
#                 environment=env_vars,
#                 shm_size="512m",  # КРИТИЧНО! Браузер впаде без цього
#                 mem_limit="1500m",  # Ліміт RAM (1.5GB)
#                 nano_cpus=1000000000,  # 1 CPU
#                 volumes={
#                     # Монтуємо папку з кодом агента всередину контейнера
#                     f"{settings.BASE_DIR}/agent_code": {
#                         "bind": "/home/kasm-user/agent",
#                         "mode": "ro",
#                     }
#                 },
#                 restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
#             )
#
#             logger.info(f"Worker {worker_name} started on port {host_port}")
#             return container.id, host_port
#
#         except docker.errors.APIError as e:
#             logger.error(f"Docker API Error: {e}")
#             raise
#         except Exception as e:
#             logger.error(f"Unexpected error creating worker: {e}")
#             raise
#
#     def stop_worker(self, container_id: str):
#         """Зупиняє та видаляє контейнер."""
#         try:
#             container = self.client.containers.get(container_id)
#             container.stop(timeout=5)
#             container.remove()
#             logger.info(f"Container {container_id} removed.")
#         except docker.errors.NotFound:
#             logger.warning(f"Container {container_id} already removed.")
#         except Exception as e:
#             logger.error(f"Error stopping worker: {e}")
#
#     def execute_command(self, container_id: str, command: str):
#         """
#         Виконує команду всередині контейнера (наприклад, запускає python-скрипт).
#         """
#         try:
#             container = self.client.containers.get(container_id)
#             # user='kasm-user' важливий, бо Kasm працює не під рутом
#             exit_code, output = container.exec_run(
#                 command, user="kasm-user", workdir="/home/kasm-user/agent"
#             )
#             return output.decode("utf-8")
#         except Exception as e:
#             logger.error(f"Exec error: {e}")
#             return str(e)
#
#
# # Створюємо singleton екземпляр
# docker_service = DockerService()
