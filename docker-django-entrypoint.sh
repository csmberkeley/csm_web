#!/usr/bin/env bash

python3 csm_web/manage.py migrate
python3 csm_web/manage.py runserver 0.0.0.0:8000
