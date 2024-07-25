#!/usr/bin/env sh
python3 csm_web/manage.py migrate
python3 csm_web/manage.py createcachetable
