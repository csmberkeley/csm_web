#!/usr/bin/env bash

# migrate the database
python3 csm_web/manage.py migrate

# create the cache table for scheduling
python3 csm_web/manage.py createcachetable

# initialize all repeated schedules
python3 csm_web/manage.py initialize_schedules

function run_server() {
    python3 csm_web/manage.py runserver 0.0.0.0:8000
}

function run_scheduler() {
    python3 csm_web/manage.py qcluster
}

export -f run_server
export -f run_scheduler

# run the server and scheduler in parallel, sharing stdout
parallel -j0 --line-buffer ::: run_server run_scheduler
