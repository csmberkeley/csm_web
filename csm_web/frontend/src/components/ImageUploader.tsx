import React, { useState } from "react";

const ImageUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

      const response = await fetch("/upload_image/", {
        method: "POST",
        body: formData
      });

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
      <h1>Image Upload Tester</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default ImageUploader;
