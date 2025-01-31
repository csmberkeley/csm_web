from storages.backends.s3boto3 import S3Boto3Storage


class ProfileImageStorage(S3Boto3Storage):
    bucket_name = "csm-web-profile-pictures"
    file_overwrite = True  # should be true so that we replace one profile for user

    def get_accessed_time(self, name):
        # Implement logic to get the last accessed time
        raise NotImplementedError("This backend does not support this method.")

    def get_created_time(self, name):
        # Implement logic to get the creation time
        raise NotImplementedError("This backend does not support this method.")

    def path(self, name):
        # S3 does not support file paths
        raise NotImplementedError("This backend does not support absolute paths.")
