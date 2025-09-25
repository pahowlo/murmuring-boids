#!/usr/bin/env python3.13

import sys
import os
import pty
import select
import subprocess
from typing import IO


class ShellProcessError(Exception):
    """Failed to successfully run a shell command."""


def run_cmd(
    *cmds: str,
    shell: str = "/bin/sh",
    quiet: bool = False,
    check: bool = False,
) -> tuple[int, str, str]:
    """Run provided command(s) in a non-interactive shell (joined with '&&').

    Args:
        quiet: If True, suppress stdout/stderr output to console.
        check: If True, raise ShellProcessError if command exits with non-zero code.

    Returns:
        - The exit code of the command.
        - The stdout output as a single string. Use .splitlines() if needed.
        - The stderr output as a single string. Use .splitlines() if needed.
    """
    # pool = ThreadPoolExecutor(max_workers=2)

    cmd = " && ".join(cmds)

    stdout_master_fd, stdout_slave_fd = pty.openpty()
    stderr_master_fd, stderr_slave_fd = pty.openpty()

    proc = subprocess.Popen(
        cmd,
        shell=True,
        executable=shell,
        stdout=stdout_slave_fd,
        stderr=stderr_slave_fd,
        text=False,  # Keep as bytes to preserve colors and other formatting
    )
    os.close(stdout_slave_fd)
    os.close(stderr_slave_fd)

    timeout_s = 0.5  # in seconds
    stdout_bytes = b""
    stderr_bytes = b""
    try:
        empty = []

        while proc.poll() is None:
            ready_fds, _, _ = select.select(
                [stdout_master_fd, stderr_master_fd], empty, empty, timeout_s
            )
            for fd in ready_fds:
                b_out = os.read(fd, 1024)  # Read from the ready file descriptor
                if not b_out:
                    continue

                if fd == stdout_master_fd:
                    if not quiet:
                        sys.stdout.buffer.write(b_out)
                        sys.stdout.buffer.flush()
                    stdout_bytes += b_out

                elif fd == stderr_master_fd:
                    if not quiet:
                        sys.stderr.buffer.write(b_out)
                        sys.stderr.buffer.flush()
                    stderr_bytes += b_out
    finally:
        proc.terminate()  # only needed if something went wrong
        os.close(stdout_master_fd)
        os.close(stderr_master_fd)

    stdout = stdout_bytes.decode("utf-8", errors="replace")
    stderr = stderr_bytes.decode("utf-8", errors="replace")
    return (proc.returncode, stdout, stderr)


def run_interactive_cmd(
    *cmds: str,
    shell: str = "/bin/sh",
    check: bool = False,
) -> int:
    """Run provided command(s) in an interactive shell (joined with '&&').

    No quiet option since user interaction is expected.

    Args:
        check: If True, raise ShellProcessError if command exits with non-zero code.

    Returns:
        - The exit code of the command.
          stdout/stderr outputs cannot be captured in interactive mode.
    """
    cmd = " && ".join(cmds)
    proc = subprocess.Popen(
        cmd,
        shell=True,
        executable=shell,
    )
    proc.wait()

    if check and proc.returncode != 0:
        raise ShellProcessError(
            f"Command failed with exit code {proc.returncode}: {cmd!r}\n"
        )
    exit_code = proc.returncode
    return exit_code


def _tee_stream(stream: IO[bytes], quiet: bool = False) -> list[str]:
    out = []
    eof = b""
    for line in iter(stream.readline, eof):
        if not line:
            continue
        if not quiet:
            sys.stdout.buffer.write(line)  # Write raw bytes to preserve colors
            sys.stdout.buffer.flush()
        out.append(line.decode("utf-8", errors="replace").strip())
    stream.close()
    return out
