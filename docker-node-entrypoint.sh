#!/usr/bin/env bash

chmod -R a+w /opt/csm_web/app/csm_web/frontend/static/frontend/
exec runuser -u node "$@"
