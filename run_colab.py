"""
One-shot launcher for Google Colab and local execution.

Usage in a Colab cell:

    import os
    from google.colab import userdata
    # Set at least one provider key (Groq is recommended for high speed):
    os.environ["GROQ_API_KEY"] = userdata.get("GROQ_API_KEY", "")
    os.environ["OPENAI_API_KEY"] = userdata.get("OPENAI_API_KEY", "")

    !pip install -q -r requirements.txt
    !python run_colab.py

This script:
  1. Starts the FastAPI backend (uvicorn) as a background subprocess.
  2. Waits for it to come up on localhost.
  3. If running inside Google Colab, prints a clickable public URL using
     google.colab.output.eval_js("google.colab.kernel.proxyPort(...)") --
     no ngrok, no external tunnel service required.
  4. Otherwise (plain local machine), prints the local URL.

Press the Colab "stop" button (or Ctrl+C locally) to shut everything down.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(HERE, "backend")
PORT = int(os.environ.get("PORT", 8000))


def wait_for_server(url: str, timeout: float = 45.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status < 500:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def get_colab_public_url(port: int) -> str | None:
    """Returns the Colab-proxied public URL for `port`, or None if not on Colab."""
    try:
        from google.colab.output import eval_js  # type: ignore
    except ImportError:
        return None
    try:
        return eval_js(f"google.colab.kernel.proxyPort({port})")
    except Exception as exc:  # noqa: BLE001
        print(f"Could not get a Colab proxy URL automatically ({exc}).")
        return None


def main() -> None:
    print("Starting Cross-Talking Multi-Agent AI System...")

    has_groq = bool(os.environ.get("GROQ_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))

    if not (has_groq or has_openai):
        print(
            "\n[WARNING] Neither GROQ_API_KEY nor OPENAI_API_KEY is detected in your environment.\n"
            "The web server will still launch so you can view the dashboard,\n"
            "but starting a team debate will require at least one valid key.\n"
        )
    else:
        active = []
        if has_groq:
            active.append("Groq")
        if has_openai:
            active.append("OpenAI")
        print(f"Configured Provider(s): {', '.join(active)}")

    env = os.environ.copy()
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(PORT)],
        cwd=BACKEND_DIR,
        env=env,
    )

    local_url = f"http://127.0.0.1:{PORT}/api/status"
    print(f"Waiting for backend on {local_url} ...")
    if not wait_for_server(local_url):
        print("Backend did not come up in time. Check the logs above for errors.")
        proc.terminate()
        return
    print("Backend is ready.")

    public_url = get_colab_public_url(PORT)

    print("=" * 70)
    if public_url:
        print(f"Open this URL in your browser:\n\n    {public_url}\n")
    else:
        print("Running in local environment.")
    print(f"Local URL: http://127.0.0.1:{PORT}\n")
    print("=" * 70)
    print("Press Ctrl+C (or Colab stop button) to terminate.")

    def shutdown(*_args):
        print("\nShutting down server...")
        proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        proc.wait()
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
