import os
import threading
import subprocess
import time
import urllib.request
import webbrowser
import tkinter as tk

BASE     = r"C:\Padaria"
BACKEND  = os.path.join(BASE, "backend")
FRONTEND = os.path.join(BASE, "frontend")
PYTHON   = os.path.join(BACKEND, "venv", "Scripts", "python.exe")

BG       = "#192819"
PANEL    = "#1F3320"
FOOT     = "#0F1A0F"
GREEN    = "#52B788"
GREEN_LT = "#D8F3DC"
GREEN_DK = "#40916C"
MUTED    = "#4A6741"
AMBER    = "#F59E0B"
RED      = "#EF4444"
WHITE    = "#E8F5E8"

SPINNER  = ["|", "/", "-", "\\"]


class LoadingApp:
    def __init__(self):
        self.root        = tk.Tk()
        self._spin_idx   = 0
        self._active_key = None
        self._done       = False
        self._build_window()
        self._build_ui()
        threading.Thread(target=self._startup, daemon=True).start()
        self._tick()
        self.root.mainloop()

    def _build_window(self):
        W, H = 500, 370
        self.root.title("ERP Padaria")
        self.root.overrideredirect(True)
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.root.geometry(f"{W}x{H}+{(sw - W) // 2}+{(sh - H) // 2}")
        self.root.configure(bg=BG)
        self.root.attributes("-topmost", True)
        self.root.config(highlightbackground="#2D6A4F", highlightthickness=1)

    def _build_ui(self):
        hdr = tk.Frame(self.root, bg=PANEL)
        hdr.pack(fill="x")
        tk.Frame(hdr, bg=PANEL, height=20).pack()
        tk.Label(hdr, text="ERP Padaria",
                 font=("Segoe UI", 26, "bold"), bg=PANEL, fg=GREEN_LT).pack()
        tk.Label(hdr, text="Sistema de Gestão de Padaria",
                 font=("Segoe UI", 10), bg=PANEL, fg=GREEN_DK).pack(pady=(3, 0))
        tk.Frame(hdr, bg=PANEL, height=18).pack()

        tk.Frame(self.root, bg="#2D6A4F", height=2).pack(fill="x")

        body = tk.Frame(self.root, bg=BG, padx=48, pady=30)
        body.pack(fill="both", expand=True)

        self._headline = tk.Label(
            body, text="Carregando, por favor aguarde...",
            font=("Segoe UI", 11), bg=BG, fg=GREEN_LT, anchor="w",
        )
        self._headline.pack(fill="x", pady=(0, 24))

        self._rows = {}
        for key, text in [
            ("porta",   "Verificando porta 8000"),
            ("build",   "Compilando interface"),
            ("server",  "Iniciando servidor"),
            ("browser", "Abrindo navegador"),
        ]:
            row  = tk.Frame(body, bg=BG)
            row.pack(fill="x", pady=6)
            dot  = tk.Label(row, text="o", font=("Courier New", 13, "bold"),
                            bg=BG, fg=MUTED, width=2)
            dot.pack(side="left")
            lbl  = tk.Label(row, text=text, font=("Segoe UI", 10),
                            bg=BG, fg=MUTED, anchor="w")
            lbl.pack(side="left", fill="x", expand=True)
            badge = tk.Label(row, text="", font=("Segoe UI", 10, "bold"),
                             bg=BG, fg=GREEN, width=7, anchor="e")
            badge.pack(side="right")
            self._rows[key] = (dot, lbl, badge)

        tk.Frame(self.root, bg="#2D6A4F", height=1).pack(fill="x")
        foot = tk.Frame(self.root, bg=FOOT, pady=10)
        foot.pack(fill="x")
        tk.Label(foot, text="localhost:8000",
                 font=("Segoe UI", 9), bg=FOOT, fg=GREEN_DK).pack()

    def _set(self, key, state):
        dot, lbl, badge = self._rows[key]
        if state == "loading":
            self._active_key = key
            dot.config(text="|", fg=AMBER)
            lbl.config(fg=WHITE)
            badge.config(text="...", fg=AMBER)
        elif state == "ok":
            if self._active_key == key:
                self._active_key = None
            dot.config(text="v", fg=GREEN)
            lbl.config(fg=WHITE)
            badge.config(text="OK", fg=GREEN)
        elif state == "error":
            if self._active_key == key:
                self._active_key = None
            dot.config(text="x", fg=RED)
            lbl.config(fg="#FCA5A5")
            badge.config(text="Erro", fg=RED)
        self.root.update_idletasks()

    def _tick(self):
        if not self._done and self._active_key:
            dot, _, _ = self._rows[self._active_key]
            dot.config(text=SPINNER[self._spin_idx % len(SPINNER)], fg=AMBER)
            self._spin_idx += 1
        self.root.after(100, self._tick)

    def _startup(self):
        self.root.after(0, lambda: self._set("porta", "loading"))
        subprocess.run(
            'for /f "tokens=5" %a in (\'netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"\') '
            'do taskkill /F /PID %a',
            shell=True, capture_output=True,
        )
        time.sleep(1)
        self.root.after(0, lambda: self._set("porta", "ok"))

        self.root.after(0, lambda: self._set("build", "loading"))
        try:
            r = subprocess.run(
                "npm run build", cwd=FRONTEND, shell=True,
                capture_output=True, timeout=180,
            )
            build_ok = r.returncode == 0
        except Exception:
            build_ok = False
        self.root.after(0, lambda: self._set("build", "ok" if build_ok else "error"))

        self.root.after(0, lambda: self._set("server", "loading"))
        env = os.environ.copy()
        env["PYTHONPATH"] = BACKEND
        subprocess.Popen(
            [PYTHON, "-m", "uvicorn", "app.main:app",
             "--host", "0.0.0.0", "--port", "8000", "--workers", "1"],
            cwd=BACKEND, env=env,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        for _ in range(40):
            try:
                urllib.request.urlopen("http://localhost:8000/api/health", timeout=1)
                break
            except Exception:
                time.sleep(1)
        self.root.after(0, lambda: self._set("server", "ok"))

        self.root.after(0, lambda: self._set("browser", "loading"))
        time.sleep(0.5)
        webbrowser.open("http://localhost:8000")
        self.root.after(0, lambda: self._set("browser", "ok"))

        self.root.after(0, lambda: self._headline.config(
            text="Sistema pronto!  Abrindo navegador...", fg=GREEN,
        ))
        self._done = True
        self.root.after(1800, self.root.destroy)


if __name__ == "__main__":
    LoadingApp()
