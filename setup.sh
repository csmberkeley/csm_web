#!/usr/bin/env bash
# Sets up environment variables and such, assuming requirements already installed.
# Kevin Svetlitski, rev. Jonathan Shi

{ [ ! -d 'csm_web' ] || [ ! -f 'package.json' ]; } && echo 'You are in the wrong directory!' 1>&2 && exit 1
[ -z "$VIRTUAL_ENV" ] && echo 'You must activate your virtualenv first!' 1>&2 && exit 1

target_version=$(sed 's/[^0-9.]//g' runtime.txt)
installed_version=$(python3 --version | sed 's/[^0-9.]//g')
if [ "$target_version" != "$installed_version" ]
then
   echo "You have python version $installed_version installed, but the expected version is $target_version.
This may cause problems."
fi

# Node and Python requirements
npm i
npm run dev
pip3 install -r requirements.txt

# Set up environment variables
echo "Setting up environment variables..."
echo "BUILDPACK_URL='https://github.com/heroku/heroku-buildpack-python'
DJANGO_ENV='dev'
DEBUG_LOG_OFF='True'
WEB_CONCURRENCY=4" > .env

# Get a new key
echo "Generating Django secret key..."
export SECRET_KEY=$(python3 csm_web/manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
echo "SECRET_KEY='$SECRET_KEY'" >> .env

# Must be pulled from Heroku (but not critical to running tests etc.)
if ! command -v heroku 1>/dev/null
then
	echo "Did not find Heroku CLI installation. OAUTH keys have not been set, so you will be unable to log in with your email."
elif heroku whoami
then
	echo "Attempting to set OAUTH keys from Heroku config..."
	heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_KEY -s >> .env
	heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET -s >> .env
else
	echo "You are not logged into the Heroku CLI. OAUTH keys have not been set, so you will be unable to log in with your email."
fi

pwd > "$VIRTUAL_ENV/.project_dir"

# Add env variables to bin/activate so that not everything needs to be run with 'heroku local'
sed 's/^/export /' .env >> "$VIRTUAL_ENV/bin/activate"

# Utility function for running the dev server
echo '
function run() {
	start_dir=$(pwd)
	project_dir=$(cat "$VIRTUAL_ENV/.project_dir")
	cd "$project_dir" && npm run dev && heroku local:run csm_web/manage.py runserver 
	cd "$start_dir"
}' >> "$VIRTUAL_ENV/bin/activate"

# TODO put precommit hooks in git?
echo "Getting precommit hooks..."
curl "http://inst.eecs.berkeley.edu/~cs199-eug/pre-commit" -o .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "Done installing. Please reactivate your virtualenv before running any more commands."
