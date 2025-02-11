#!/usr/bin/env bash

function run_server() {
    gunicorn csm_web.wsgi
}

function run_scheduler() {
    python3 manage.py qcluster
}

export -f run_server
export -f run_scheduler

# run the server and scheduler in parallel, sharing stdout
parallel -j0 --line-buffer ::: run_server run_scheduler
