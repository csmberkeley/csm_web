#!/usr/bin/env bash
[ ! -f 'package.json' ] && echo 'You are in the wrong directory!' && exit 1
[ -z "$VIRTUAL_ENV" ] && echo 'You must activate your virtualenv first!' && exit 1
npm i
npm run dev
echo "BUILDPACK_URL='https://github.com/heroku/heroku-buildpack-python'
DATABASE_URL='postgres://csm_web:Uam9^GqIa5MzYpI^36LKYiis^yNFj3jB@csm-web.cuzg3tdrhla4.us-east-1.rds.amazonaws.com/csm_web?sslrootcert=/home/matthew/.ssh/rds-combined-ca-bundle.pem&sslmode=require'
DJANGO_ENV=dev
PAPERTRAIL_API_TOKEN=2uaYNnjQdG8gb5AUzL5v
DEBUG_LOG_OFF='True'
SECRET_KEY='a-enjlfz^1=1e0paksqj)psmz32g2bv)t8y161uplbj_6*l)15'
SENTRY_DSN='https://76085623af5c4577887dd4c87ba4954d:7db07f04a845421981d2cc05d86440ba@sentry.io/1391866'
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=201546588907-8pdr6350m2rkaje45e8sg2shjsjscqto.apps.googleusercontent.com
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=VQLj1WNg2kjagU1vrnAUA3dj
WEB_CONCURRENCY=4" > .env
pwd > "$VIRTUAL_ENV/.project_dir"
echo 'alias run='\''cd $(cat "$VIRTUAL_ENV/.project_dir") && npm run dev && heroku local:run python csm_web/manage.py runserver'\''' >> "$VIRTUAL_ENV/bin/activate"
pip install -r requirements.txt
pip install black
curl 'http://inst.eecs.berkeley.edu/~cs199-eug/pre-commit' -o .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
brew tap heroku/brew && brew install heroku
heroku local:run python csm_web/manage.py migrate
heroku local:run python csm_web/manage.py createtestdata
#heroku local:run python csm_web/manage.py runserver
npm install -g prettier eslint eslint-plugin-react eslint-plugin-prettier babel-eslint
