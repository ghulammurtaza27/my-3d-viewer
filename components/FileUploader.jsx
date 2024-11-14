// components/FileUploader.jsx
import React, { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { FileText, AlertCircle } from 'lucide-react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

const CADFileUploader = ({ onFileLoad, type, disabled }) => {
  const [uploadStatus, setUploadStatus] = useState({
    progress: 0,
    error: null,
    loading: false,
    success: false,
  });

  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['obj', 'stl'].includes(extension)) {
      throw new Error('Invalid file type. Please upload .obj or .stl files');
    }

    return extension;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extension = validateFile(file);
      setUploadStatus({ progress: 0, error: null, loading: true, success: false });

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let loader;
          let geometry;
          const fileContent = e.target.result;

          if (extension === 'stl') {
            loader = new STLLoader();
            geometry = loader.parse(fileContent);
            const material = new THREE.MeshPhongMaterial();
            const mesh = new THREE.Mesh(geometry, material);
            onFileLoad(file.name, mesh);
          } else {
            loader = new OBJLoader();
            const object = loader.parse(fileContent);
            onFileLoad(file.name, object);
          }

          setUploadStatus({ progress: 100, error: null, loading: false, success: true });
        } catch (error) {
          setUploadStatus({
            progress: 0,
            error: `Error parsing file: ${error.message}`,
            loading: false,
            success: false,
          });
        }
      };

      reader.onerror = () => {
        setUploadStatus({
          progress: 0,
          error: 'Error reading file',
          loading: false,
          success: false,
        });
      };

      if (extension === 'stl') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      setUploadStatus({
        progress: 0,
        error: error.message,
        loading: false,
        success: false,
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
        ${uploadStatus.error ? 'border-red-300 bg-red-50' :
        uploadStatus.success ? 'border-green-300 bg-green-50' :
        'border-gray-300 bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <FileText className={`w-8 h-8 mb-2 ${
            uploadStatus.error ? 'text-red-500' :
            uploadStatus.success ? 'text-green-500' :
            'text-gray-500'
          }`} />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">.STL or .OBJ files</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept=".stl,.obj"
          onChange={handleFileUpload}
          disabled={disabled}
        />
      </label>

      {uploadStatus.loading && (
        <Progress value={uploadStatus.progress} className="mt-4" />
      )}

      {uploadStatus.error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadStatus.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CADFileUploader;