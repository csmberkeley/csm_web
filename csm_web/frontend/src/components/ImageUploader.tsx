import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";

const MAX_FILE_SIZE_BYTES = 3 * 150 * 150;

const ImageUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setStatus(`File size exceeds max limit of ${MAX_FILE_SIZE_BYTES}`);
      }
      setFile(selectedFile);
      setStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file to upload");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithMethod(`user/upload_image/`, HTTP_METHODS.POST, formData, true);

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      setStatus(`File uploaded successfully`);
    } catch (error) {
      setStatus(`Upload failed: ${(error as Error).message}`);
    }
  };
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default ImageUploader;
