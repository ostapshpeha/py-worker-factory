import os

import docker
import logging
from typing import Tuple, Optional
from docker.models.containers import Container
from docker.errors import APIError, NotFound

logger = logging.getLogger(__name__)


class DockerService:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"Failed to connect to Docker Daemon: {e}")
            raise

    # Метод find_free_port ВИДАЛЕНО! Docker зробить це краще.

    def create_kasm_worker(
        self, worker_name: str, vnc_password: str
    ) -> Tuple[str, int]:
        """
        Starts the KasmVNC container.
        Returns: (container_id, mapped_host_port)
        """
        try:
            env_vars = {
                "VNC_USER": "kasm_user",
                "VNC_PW": vnc_password,
                "VNC_VIEW_ONLY": "false",
                "APP_ARGS": "--no-sandbox",
            }
            host_absolute_path = "C:/Users/stark/py-woker-factory/agent_code_shared"
            # base_host_path = os.getenv("HOST_PROJECT_PATH", "/app")
            # host_volume_path = f"{base_host_path}/agent_code_shared"
            volumes = {
                host_absolute_path: {
                    "bind": "/home/kasm-user/agent",
                    "mode": "rw"
                }
            }

            container: Container = self.client.containers.run(
                image="custom-kasm-worker:latest",
                name=worker_name,
                detach=True,
                ports={"6901/tcp": None},
                environment=env_vars,
                shm_size="512m",
                mem_limit="1500m",
                nano_cpus=1000000000,
                volumes=volumes,
                network="worker_factory_default",
                restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
            )

            # Оскільки ми дозволили Докеру вибрати порт, нам треба дізнатись, який саме він вибрав:
            container.reload()  # Оновлюємо метадані контейнера

            # Парсимо словник з портами: NetworkSettings -> Ports -> '6901/tcp' -> HostPort
            ports_info = (
                container.attrs.get("NetworkSettings", {})
                .get("Ports", {})
                .get("6901/tcp")
            )

            if not ports_info:
                # Fallback, якщо щось пішло не так і порт не прокинувся
                self.stop_worker(container.id)
                raise RuntimeError("Docker failed to assign a host port.")

            host_port = int(ports_info[0]["HostPort"])

            logger.info(f"Worker {worker_name} started on port {host_port}")
            return container.id, host_port

        except APIError as e:
            logger.error(f"Docker API Error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating worker: {e}")
            raise

    def stop_worker(self, container_id: str):
        try:
            container: Container = self.client.containers.get(container_id)
            container.stop(timeout=5)
            container.remove()
            logger.info(f"Container {container_id} removed.")
        except NotFound:
            logger.warning(f"Container {container_id} already removed.")
        except APIError as e:
            logger.error(f"Error stopping worker {container_id}: {e}")

    def execute_command(self, container_id: str, command: str, user: str = "kasm-user") -> str:
        """
        Executes a command inside a container.
        """
        try:
            container: Container = self.client.containers.get(container_id)

            workdir = "/home/kasm-user/agent" if user == "kasm-user" else "/"

            exit_code, output = container.exec_run(
                command, user=user, workdir=workdir
            )
            return output.decode("utf-8")
        except NotFound:
            return f"Error: Container {container_id} not found."
        except Exception as e:
            logger.error(f"Exec error in {container_id}: {e}")
            return str(e)


docker_service = DockerService()
