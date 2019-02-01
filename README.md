# CSM Web Applications
This repository is for the Django CSM Web project that contains the Scheduler
application (and possibly more applications to come).

## Install
We recommend running this with a Python virtual environment.

If you don't have virtualenv,
```
pip install virtualenv
```

To create the virtualenv, run
```
virtualenv venv
```
You may need to specify the Python version 
(you can find the path to Python3 with `which python3`)
in which case run the following instead
```
virtualenv --python=/usr/local/bin/python3 venv
```

To create install dependencies,
```
source venv/bin/activate
pip install -r csm_web/requirements.txt
npm i
```

## Starting Django
To start the Django server,
```
npm run dev && python csm_web/manage.py runserver
```
To populate the database with test data,
```
python csm_web/manage.py createtestdata
```
