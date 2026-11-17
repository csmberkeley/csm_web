#!/usr/bin/env bash

python3 csm_web/manage.py migrate
# --nostatic leaves static files to urls.py, which tells browsers not to cache them
exec python3 csm_web/manage.py runserver --nostatic 0.0.0.0:8000
