#!/usr/bin/env bash
# Sets up environment variables and such, assuming requirements already installed.
# Kevin Svetlitski, rev. Jonathan Shi

[ ! -f 'package.json' ] && echo 'You are in the wrong directory!' && exit 1
[ -z "$VIRTUAL_ENV" ] && echo 'You must activate your virtualenv first!' && exit 1

# Node and Python requirements
npm i
npm run dev
pip3 install -r requirements.txt

# Set up environment variables
echo "Setting up environment variables..."
echo "BUILDPACK_URL='https://github.com/heroku/heroku-buildpack-python'
DJANGO_ENV=dev
DEBUG_LOG_OFF='True'
WEB_CONCURRENCY=4" > .env

# Get a new key
echo "Generating Django secret key..."
export SECRET_KEY=$(echo "from django.core.management.utils import get_random_secret_key; \
	print(get_random_secret_key())" | python3 csm_web/manage.py shell)
echo "SECRET_KEY='$SECRET_KEY'" >> .env

# Must be pulled from Heroku (but not critical to running tests etc.)
if [[ $(heroku whoami) ]]; then
	echo "Attempting to set OAUTH keys from heroku config..."
	echo $(heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_KEY -s) >> .env
	echo $(heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET -s) >> .env
else
	echo "Did not find Heroku CLI installation. OAUTH keys have not been set, so you will be unable to log in with your email."
fi

pwd > "$VIRTUAL_ENV/.project_dir"

# Slightly jank hack to get .env to source properly
cat <<EOF >> $VIRTUAL_ENV/bin/activate
# Scheduler: get variables in .env
while read v; do
	export \$v
done < $(pwd)/.env
EOF

# TODO put precommit hooks in git?
echo "Getting precommit hooks..."
curl "http://inst.eecs.berkeley.edu/~cs199-eug/pre-commit" -o .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "Done installing. Please reactivate your virtualenv before running any more commands."