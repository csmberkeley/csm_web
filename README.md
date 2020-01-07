# CSM Web Applications
This repository contains webapps that help support the infrastructure of CSM. Currently, it only holds Scheduler (our section signup and attendance system), but more are on the way.
## Installing
### Requirements
We don't know what specific minimum version you would need for any of the following software, but the most recent version of any of the below should work.

* Python 3.7
  * [virtualenv](https://packaging.python.org/guides/installing-using-pip-and-virtualenv/) (`pip install virtualenv`)
  * [autopep8](https://pypi.org/project/autopep8/) (`pip install autopep8`)
* [npm](https://www.npmjs.com/get-npm)
  * [prettier](https://prettier.io/) (`npm install -g prettier`)
  * [eslint](https://eslint.org/) (`npm install -g eslint`; `npm install -g eslint-plugin-react`)
* [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) (`brew tap heroku/brew && brew install heroku`)
  * Create an account on [Heroku](https://id.heroku.com/login) and [login](https://devcenter.heroku.com/articles/heroku-cli#getting-started)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) (`brew install awscli`)
  * We use an S3 bucket to store profile pictures and other media. See [here](https://aws.amazon.com/s3/) to get started.

Other miscellaneous requirements will be installed by the commands below.

### Setup
To ensure package version consistency and avoid polluting your global package installations, we highly recommend running the server with [virtualenv](https://virtualenv.pypa.io/en/stable/) (`pip install virtualenv`).

From a terminal in the top level of the project directory, run `python3 -m virtualenv venv`.

To activate the environment, run `source venv/bin/activate`. You will need to run this command every time you open a new terminal.

Finally, run `./setup.sh`. This will install additional requirements needed by the server, and set up some necessary environment variables.

## Running
To start the Django server, run `python csm_web/manage.py runserver` and visit `localhost:8000` in your browser.

Run `python csm_web/manage.py createtestdata` to generate some test data.

*If you are working on the frontend*:

Run `npm run watch`, which will automatically rebuild the JS bundle if any changes to the frontend JS are detected

(Alternatively you can run `npm run dev` manually each time you make changes to the frontend)

## Troubleshooting
* OSX: error on running `pip`
  * Try replacing `pip` with `pip3` instead.
