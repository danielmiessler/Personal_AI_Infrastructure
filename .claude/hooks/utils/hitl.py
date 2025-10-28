import json
import socket
import asyncio
from threading import Thread
from typing import Optional, Dict, Any, Literal
import time


class HITLRequest:
    """Helper class for human-in-the-loop requests"""

    def __init__(
        self,
        question: str,
        hitl_type: Literal['question', 'permission', 'choice'] = 'question',
        choices: Optional[list[str]] = None,
        timeout: int = 300,  # 5 minutes default
        observability_url: str = "http://localhost:4000"
    ):
        self.question = question
        self.hitl_type = hitl_type
        self.choices = choices
        self.timeout = timeout
        self.observability_url = observability_url
        self.response_port = self._find_free_port()
        self.response_data: Optional[Dict[str, Any]] = None
        self.server_thread: Optional[Thread] = None

    def _find_free_port(self) -> int:
        """Find an available port for WebSocket server"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def _start_response_server(self):
        """Start local WebSocket server to receive response"""
        try:
            from websockets.server import serve
        except ImportError:
            print("Warning: websockets package not installed. Install with: pip install websockets")
            return

        async def handle_connection(websocket):
            """Handle incoming response from observability server"""
            try:
                message = await websocket.recv()
                self.response_data = json.loads(message)
                await websocket.close()
            except Exception as e:
                print(f"Error receiving HITL response: {e}")

        async def start_server():
            try:
                async with serve(handle_connection, "localhost", self.response_port):
                    # Keep server running until response received or timeout
                    start_time = time.time()
                    while self.response_data is None:
                        await asyncio.sleep(0.1)
                        if time.time() - start_time > self.timeout:
                            break
            except Exception as e:
                print(f"Error starting WebSocket server: {e}")

        # Run server in event loop
        try:
            asyncio.run(start_server())
        except Exception as e:
            print(f"Error in response server: {e}")

    def get_hitl_data(self) -> Dict[str, Any]:
        """Get HITL data for inclusion in HookEvent"""
        return {
            "question": self.question,
            "responseWebSocketUrl": f"ws://localhost:{self.response_port}",
            "type": self.hitl_type,
            "choices": self.choices,
            "timeout": self.timeout,
            "requiresResponse": True
        }

    def send_and_wait(
        self,
        hook_event_data: Dict[str, Any],
        session_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Send HITL request and wait for response

        Args:
            hook_event_data: The hook event payload
            session_data: Session information (session_id, source_app, etc.)

        Returns:
            Response data or None if timeout
        """
        # Prepare complete event with HITL data FIRST (parallel prep)
        event_payload = {
            **session_data,
            "hook_event_type": hook_event_data.get("hook_event_type", "HumanInTheLoop"),
            "payload": hook_event_data.get("payload", {}),
            "humanInTheLoop": self.get_hitl_data(),
            "timestamp": int(time.time() * 1000)
        }

        # Start local server in background thread
        self.server_thread = Thread(target=self._start_response_server, daemon=True)
        self.server_thread.start()

        # Minimal delay - just enough for socket to bind (reduced from 0.5s)
        time.sleep(0.1)

        # Send to observability server immediately
        try:
            import requests
            response = requests.post(
                f"{self.observability_url}/events",
                json=event_payload,
                timeout=10
            )
            response.raise_for_status()
        except ImportError:
            print("Warning: requests package not installed. Install with: pip install requests")
            return None
        except Exception as e:
            print(f"Failed to send HITL request: {e}")
            return None

        # Wait for response
        self.server_thread.join(timeout=self.timeout)

        return self.response_data


# Convenience functions
def ask_question(
    question: str,
    session_data: Dict[str, Any],
    timeout: int = 300
) -> Optional[str]:
    """Ask a question and wait for text response"""
    hitl = HITLRequest(question, hitl_type='question', timeout=timeout)
    response = hitl.send_and_wait(
        {"hook_event_type": "HumanInTheLoop", "payload": {}},
        session_data
    )
    return response.get("response") if response else None


def ask_permission(
    question: str,
    session_data: Dict[str, Any],
    timeout: int = 300
) -> bool:
    """Ask for permission and wait for yes/no response"""
    hitl = HITLRequest(question, hitl_type='permission', timeout=timeout)
    response = hitl.send_and_wait(
        {"hook_event_type": "HumanInTheLoop", "payload": {}},
        session_data
    )
    return response.get("permission", False) if response else False


def ask_choice(
    question: str,
    choices: list[str],
    session_data: Dict[str, Any],
    timeout: int = 300
) -> Optional[str]:
    """Ask user to choose from options"""
    hitl = HITLRequest(
        question,
        hitl_type='choice',
        choices=choices,
        timeout=timeout
    )
    response = hitl.send_and_wait(
        {"hook_event_type": "HumanInTheLoop", "payload": {}},
        session_data
    )
    return response.get("choice") if response else None
