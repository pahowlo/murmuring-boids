#!/usr/bin/env python3.13

import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import IO


@dataclass
class ShellProcess:
    cmd: str
    exit_code: int
    stdout: list[str]
    stderr: list[str]

    def successful(self) -> bool:
        return self.exit_code == 0


def run_cmd(
    cmd: str, shell: str = "/bin/sh", quiet: bool = False
) -> subprocess.CompletedProcess:
    pool = ThreadPoolExecutor(max_workers=2)

    # Always use PIPEs so we can capture
    proc = subprocess.Popen(
        cmd,
        shell=True,
        executable=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )

    stdout_stream = pool.submit(_tee_stream, proc.stdout, quiet=quiet)
    stderr_stream = pool.submit(_tee_stream, proc.stderr, quiet=quiet)

    proc.wait()
    pool.shutdown()
    stdout_lines = stdout_stream.result()
    stderr_lines = stderr_stream.result()

    return ShellProcess(
        cmd=cmd,
        exit_code=proc.returncode,
        stdout=stdout_lines,
        stderr=stderr_lines,
    )


def _tee_stream(stream: IO[str], quiet: bool = False) -> list[str]:
    out = []
    eof = ""
    for line in iter(stream.readline, eof):
        if not line:
            continue
        if not quiet:
            print(line, end="")
        out.append(line)
    stream.close()
    return out
