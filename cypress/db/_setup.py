import importlib
import os
import re
import sys
from pathlib import Path

import django
from django.core.cache import cache
from django.core.management import call_command

CWD = os.getcwd()
CACHE_KEY = "CYPRESS_LAST_FUNCTION"
CACHE_TIMEOUT = 60 * 60 * 24
CYPRESS_SETUP_ROOT = os.path.join(CWD, "cypress", "db")
sys.path.append(os.path.join(CWD, "csm_web"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "csm_web.settings")


def main(script_path: str, func_name: str, force=False, init=False):
    if init:
        os.chdir("csm_web")
        django.setup()
        call_command("migrate", verbosity=0)
        call_command("createcachetable")
        cache.delete(CACHE_KEY)
        os.chdir("..")
        return

    # validate args
    assert re.fullmatch(r"^$|^[a-zA-Z0-9_/\.\-]+$", script_path)
    assert re.fullmatch(r"^[a-zA-Z0-9_]+$", func_name)

    cache_val = cache.get(CACHE_KEY)
    if not force and cache_val == (script_path, func_name):
        return  # don't need to do anything

    # set up django settings
    django.setup()

    call_command("flush", interactive=False)

    # load function from script (importlib magic)
    location = (Path(CYPRESS_SETUP_ROOT) / script_path).with_suffix(".py")
    assert location.is_file()

    spec = importlib.util.spec_from_file_location("cypress_setup", location)
    cypress_setup_module = importlib.util.module_from_spec(spec)
    sys.modules["cypress_setup"] = cypress_setup_module
    spec.loader.exec_module(cypress_setup_module)
    cypress_setup_func = getattr(cypress_setup_module, func_name)

    # run the function
    cypress_setup_func()

    cache.set(CACHE_KEY, (script_path, func_name), CACHE_TIMEOUT)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        "setup",
        description="Set up a Django database for Cypress tests",
    )

    parser.add_argument(
        "script_path",
        type=str,
        nargs="?",
        help="path to the script, relative to CYPRESS_SETUP_ROOT",
    )
    parser.add_argument(
        "func_name",
        type=str,
        nargs="?",
        help="function in the script to run",
    )
    parser.add_argument(
        "--force", action="store_true", help="whether to force a database flush"
    )
    parser.add_argument(
        "--init",
        action="store_true",
        help="initialize the database; run migrate and createcachetable",
    )

    args = parser.parse_args()

    main(args.script_path, args.func_name, force=args.force, init=args.init)
