"""
Django settings for csm_web project.

Generated by 'django-admin startproject' using Django 2.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

import os
from factory.django import DjangoModelFactory
from rest_framework.serializers import ModelSerializer, Serializer
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

# Analogous to RAILS_ENV, is one of {prod, staging, dev}. Defaults to dev. This default can
# be dangerous, but is worth it to avoid the hassle for developers setting the local ENV var
DEVELOPMENT = "dev"
PRODUCTION = "prod"
STAGING = "staging"
DJANGO_ENV = os.environ.get("DJANGO_ENV", DEVELOPMENT)
assert DJANGO_ENV in (DEVELOPMENT, STAGING, PRODUCTION)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = DJANGO_ENV == DEVELOPMENT

if DJANGO_ENV == PRODUCTION or DJANGO_ENV == STAGING:
    sentry_sdk.init(dsn=os.environ.get('SENTRY_DSN'), integrations=[DjangoIntegration()], send_default_pii=True)

ALLOWED_HOSTS = []

ADMINS = [
    ("Jonathan Shi", "jhshi@berkeley.edu"),
    ("Kevin Svetlitski", "kevin_svetlitski@berkeley.edu"),
    ("Alec Li", "alec.li@berkeley.edu"),
    ("Noor Mahini", "nmahini@berkeley.edu"),
    ("Rohan D'Souza", "rohan.ds1001@berkeley.edu"),
    ("Naveen Gopalan", "ngopalan@berkeley.edu")
]

# Application definition

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "csm_web.apps.AdminConfig",
    "scheduler.apps.SchedulerConfig",
    "rest_framework",
    "social_django",
    "frontend",
    "django_extensions",
    "django.contrib.postgres",
]

SHELL_PLUS_SUBCLASSES_IMPORT = [ModelSerializer, Serializer, DjangoModelFactory]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.gzip.GZipMiddleware"
]

ROOT_URLCONF = "csm_web.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, 'templates/')],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ]
        },
    }
]

WSGI_APPLICATION = "csm_web.wsgi.application"

DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

POSTGRES_EXTRA_AUTO_EXTENSION_SET_UP = False
POSTGRES_EXTRA_DB_BACKEND_BASE = 'django.db.backends.postgresql'
# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

if DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'psqlextra.backend',
            'NAME': 'csm_web_dev',
            'USER': 'postgres',
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }
else:
    DATABASES = {
        "pg": {
            "ENGINE": "psqlextra.backend",
            "NAME": "csm_web",
            "USER": "csm_web",
            "PASSWORD": "",
            "HOST": "localhost",
            "PORT": "",
        }
    }


# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "scheduler.User"


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "America/Los_Angeles"

USE_I18N = True

USE_TZ = True

# AWS environment variables for S3 resource storage
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME")
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_VERIFY = True
AWS_QUERYSTRING_AUTH = False  # public bucket
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/

STATIC_URL = "/static/"

if DJANGO_ENV in (PRODUCTION, STAGING):
    # Enables compression and caching
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
    WHITENOISE_MAX_AGE = 31536000  # one year

AUTHENTICATION_BACKENDS = (
    # Google OAuth2
    "social_core.backends.google.GoogleOAuth2",
    # Django
    "django.contrib.auth.backends.ModelBackend",
)

# Python Social Auth

LOGIN_REDIRECT_URL = "/"

LOGIN_URL = "/login/"

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")

SOCIAL_AUTH_PIPELINE = (
    "social_core.pipeline.social_auth.social_details",
    "social_core.pipeline.social_auth.social_uid",
    "social_core.pipeline.social_auth.auth_allowed",
    "social_core.pipeline.social_auth.social_user",
    "social_core.pipeline.user.get_username",
    "social_core.pipeline.social_auth.associate_by_email",  # enables ghost profiles
    "social_core.pipeline.user.create_user",
    "social_core.pipeline.social_auth.associate_user",
    "social_core.pipeline.social_auth.load_extra_data",
    "social_core.pipeline.user.user_details",
)

SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")
SOCIAL_AUTH_GOOGLE_OAUTH2_IGNORE_DEFAULT_SCOPE = True
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# To fix AuthStateMissing error: https://github.com/python-social-auth/social-core/issues/250
SESSION_COOKIE_SAMESITE = None

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer"
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        'rest_framework.permissions.IsAuthenticated'
    ],
    "DEFAULT_PARSER_CLASSES": [
        'djangorestframework_camel_case.parser.CamelCaseJSONParser',
    ]
}

if DJANGO_ENV == DEVELOPMENT:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'db_cache_table',
    }
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'scheduler.views': {
            'handlers': ['console'],
            'level': 'INFO',
            'propogate': True,
        },
        'scheduler.models': {
            'handlers': ['console'],
            'level': 'INFO',
            'propogate': True,
        }
    },
}

if DJANGO_ENV in (PRODUCTION, STAGING):
    # Security/HTTPS headers
    # https://docs.djangoproject.com/en/2.1/ref/middleware/#module-django.middleware.security
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_PRELOAD = True
    # ideally would be handled by nginx or something, but needed for heroku
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Content Security Policy
    MIDDLEWARE.append("csp.middleware.CSPMiddleware")
    CSP_DEFAULT_SRC = ("'none'", )
    CSP_SCRIPT_SRC = ("'self'", "https://unpkg.com/react@18/umd/",
                      "https://unpkg.com/react-dom@18/umd/")
    CSP_STYLE_SRC = ("'self'", "https://fonts.googleapis.com")
    CSP_CONNECT_SRC = ("'self'",)
    CSP_IMG_SRC = ("'self'", "data:")
    CSP_FONT_SRC = ("https://fonts.gstatic.com",)
    CSP_FRAME_ANCESTORS = ("'none'",)
    CSP_BLOCK_ALL_MIXED_CONTENT = True

    # Heroku setup
    import django_heroku

    django_heroku.settings(locals())
