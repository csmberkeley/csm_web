import React, { useState, useEffect } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";

// file size limits
const MAX_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ImageUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  // useEffect(() => {
  //   if (file) {
  //   }
  // }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile) {
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
          setStatus(`File size exceeds max limit of ${MAX_SIZE_MB}MB.`);
        } else {
          setFile(selectedFile);
          setStatus("");
        }
      }
    }
  };

  const handleUpload = async () => {
    try {
      if (!file) {
        setStatus("Please select a file to upload");
        return;
      }
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetchWithMethod(`user/upload_image/`, HTTP_METHODS.POST, formData, true);

      console.log(response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error:", errorData.error || "Unknown error");
        throw new Error(errorData.error || "Failed to upload file");
      }
      setStatus(`File uploaded successfully`);
    } catch (error) {
      setStatus(`Upload failed: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h1>Image Upload Tester</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default ImageUploader;
