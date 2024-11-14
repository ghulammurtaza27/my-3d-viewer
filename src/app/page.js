'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ModelViewer } from '../../components/ModelViewer';
import CADFileUploader from '../../components/FileUploader';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { InfoCircle } from 'lucide-react';

// Add material properties mapping
const MATERIAL_PROPERTIES = {
  metallic: {
    name: 'Metallic',
    defaultValue: 0.5,
    unit: '',
    range: [0, 1]
  },
  roughness: {
    name: 'Roughness',
    defaultValue: 0.5,
    unit: '',
    range: [0, 1]
  },
  density: {
    name: 'Density',
    defaultValue: 1.0,
    unit: 'g/cm³',
    range: [0.1, 25]
  },
  elasticModulus: {
    name: 'Elastic Modulus',
    defaultValue: 200,
    unit: 'GPa',
    range: [0.1, 1000]
  },
  thermalConductivity: {
    name: 'Thermal Conductivity',
    defaultValue: 50,
    unit: 'W/(m·K)',
    range: [0.1, 500]
  }
};

export default function Home() {
  const [originalModel, setOriginalModel] = useState(null);
  const [modifiedModel, setModifiedModel] = useState(null);
  const [compareResults, setCompareResults] = useState(null);
  const [loading, setLoading] = useState({
    original: false,
    modified: false,
    comparing: false
  });
  const [error, setError] = useState(null);
  

  const [materialSettings, setMaterialSettings] = useState({
    original: {
      name: 'Default Material',
      color: '#cccccc',
      metallic: MATERIAL_PROPERTIES.metallic.defaultValue,
      roughness: MATERIAL_PROPERTIES.roughness.defaultValue,
      density: MATERIAL_PROPERTIES.density.defaultValue,
      elasticModulus: MATERIAL_PROPERTIES.elasticModulus.defaultValue,
      thermalConductivity: MATERIAL_PROPERTIES.thermalConductivity.defaultValue,
    },
    modified: {
      name: 'Default Material',
      color: '#cccccc',
      metallic: MATERIAL_PROPERTIES.metallic.defaultValue,
      roughness: MATERIAL_PROPERTIES.roughness.defaultValue,
      density: MATERIAL_PROPERTIES.density.defaultValue,
      elasticModulus: MATERIAL_PROPERTIES.elasticModulus.defaultValue,
      thermalConductivity: MATERIAL_PROPERTIES.thermalConductivity.defaultValue,
    }
  });


  const handleFileLoad = (filename, modelData, type) => {
    setError(null);
    setLoading(prev => ({ ...prev, [type]: true }));

    try {
      // Calculate model statistics
      let vertexCount = 0;
      let faceCount = 0;
      let boundingBox = new THREE.Box3();

      if (!modelData) {
        throw new Error('Model data is undefined or null');
      }

      // Ensure the model is properly initialized
      if (modelData.isBufferGeometry) {
        // Handle STL files (which return geometry directly)
        const geometry = modelData;
        const material = new THREE.MeshPhongMaterial();
        modelData = new THREE.Mesh(geometry, material);
      }

      modelData.traverse((child) => {
        if (child.isMesh) {
          if (!child.geometry) {
            throw new Error('Mesh geometry is undefined');
          }
          
          const geometry = child.geometry;
          vertexCount += geometry.attributes.position.count;
          faceCount += geometry.index ? 
            geometry.index.count / 3 : 
            geometry.attributes.position.count / 3;
          
          // Update bounding box
          geometry.computeBoundingBox();
          boundingBox.expandByObject(child);
        }
      });

      // Verify bounding box calculations
      if (!boundingBox.min || !boundingBox.max) {
        throw new Error('Failed to calculate model dimensions');
      }

      const modelInfo = {
        model: modelData,
        stats: {
          vertices: vertexCount,
          faces: faceCount,
          dimensions: {
            x: boundingBox.max.x - boundingBox.min.x,
            y: boundingBox.max.y - boundingBox.min.y,
            z: boundingBox.max.z - boundingBox.min.z
          }
        }
      };

      if (type === 'original') {
        setOriginalModel(modelInfo);
      } else {
        setModifiedModel(modelInfo);
      }
      // Extract material information if available
      let materialInfo = {
        name: 'Default Material',
        color: '#cccccc',
        metallic: MATERIAL_PROPERTIES.metallic.defaultValue,
        roughness: MATERIAL_PROPERTIES.roughness.defaultValue,
        density: MATERIAL_PROPERTIES.density.defaultValue,
        elasticModulus: MATERIAL_PROPERTIES.elasticModulus.defaultValue,
        thermalConductivity: MATERIAL_PROPERTIES.thermalConductivity.defaultValue,
      };

      if (modelData.material) {
        const material = modelData.material;
        materialInfo = {
          name: material.name || materialInfo.name,
          color: material.color ? `#${material.color.getHexString()}` : materialInfo.color,
          metallic: material.metalness !== undefined ? material.metalness : materialInfo.metallic,
          roughness: material.roughness !== undefined ? material.roughness : materialInfo.roughness,
          density: material.userData?.density || materialInfo.density,
          elasticModulus: material.userData?.elasticModulus || materialInfo.elasticModulus,
          thermalConductivity: material.userData?.thermalConductivity || materialInfo.thermalConductivity,
        };
      }

      setMaterialSettings(prev => ({
        ...prev,
        [type]: materialInfo
      }));

    } catch (error) {
      console.error('Error processing model:', error);
      setError(`Error processing ${type} model: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const compareMaterials = () => {
    if (!materialSettings.original || !materialSettings.modified) {
      return null;
    }

    const calculateDiff = (newVal, oldVal) => ((newVal - oldVal) / oldVal) * 100;

    return {
      colorDiff: materialSettings.original.color !== materialSettings.modified.color,
      metallicDiff: calculateDiff(materialSettings.modified.metallic, materialSettings.original.metallic),
      roughnessDiff: calculateDiff(materialSettings.modified.roughness, materialSettings.original.roughness),
      densityDiff: calculateDiff(materialSettings.modified.density, materialSettings.original.density),
      elasticModulusDiff: calculateDiff(materialSettings.modified.elasticModulus, materialSettings.original.elasticModulus),
      thermalConductivityDiff: calculateDiff(materialSettings.modified.thermalConductivity, materialSettings.original.thermalConductivity),
    };
  };

  const compareModels = () => {
    if (!originalModel?.model || !modifiedModel?.model) {
      setError('Both models must be loaded to compare');
      return;
    }

    setLoading(prev => ({ ...prev, comparing: true }));
    try {
      const original = originalModel.stats;
      const modified = modifiedModel.stats;
  
      // Calculate percentage differences with safety checks
      const calculatePercentageDiff = (newValue, oldValue) => {
        if (typeof newValue !== 'number' || typeof oldValue !== 'number' || oldValue === 0) {
          return 0;
        }
        return ((newValue - oldValue) / oldValue) * 100;
      };
  
       // Calculate geometry differences
    const vertexDiff = calculatePercentageDiff(modified.vertices, original.vertices);
    const faceDiff = calculatePercentageDiff(modified.faces, original.faces);
      
    const dimensionDiff = {
      x: calculatePercentageDiff(modified.dimensions?.x, original.dimensions?.x) || 0,
      y: calculatePercentageDiff(modified.dimensions?.y, original.dimensions?.y) || 0,
      z: calculatePercentageDiff(modified.dimensions?.z, original.dimensions?.z) || 0
    };
       // Calculate volume with validation
    const originalVolume = original.dimensions ? 
    original.dimensions.x * original.dimensions.y * original.dimensions.z : 0;
  const modifiedVolume = modified.dimensions ? 
    modified.dimensions.x * modified.dimensions.y * modified.dimensions.z : 0;
  const volumeDiff = calculatePercentageDiff(modifiedVolume, originalVolume);
  
         // Calculate material differences
    const materialDiffs = {
      colorDiff: materialSettings.original.color !== materialSettings.modified.color,
      metallicDiff: calculatePercentageDiff(
        materialSettings.modified.metallic,
        materialSettings.original.metallic
      ),
      roughnessDiff: calculatePercentageDiff(
        materialSettings.modified.roughness,
        materialSettings.original.roughness
      ),
      densityDiff: calculatePercentageDiff(
        materialSettings.modified.density,
        materialSettings.original.density
      ),
      elasticModulusDiff: calculatePercentageDiff(
        materialSettings.modified.elasticModulus,
        materialSettings.original.elasticModulus
      ),
      thermalConductivityDiff: calculatePercentageDiff(
        materialSettings.modified.thermalConductivity,
        materialSettings.original.thermalConductivity
      )
    };

  
    setCompareResults({
      vertexDiff,
      faceDiff,
      dimensionDiff,
      volumeDiff,
      materialDiffs,
      original: {
        ...original,
        material: materialSettings.original
      },
      modified: {
        ...modified,
        material: materialSettings.modified
      },
      timestamp: new Date().toISOString()
    });
    } catch (error) {
      console.error('Comparison error:', error);
      setError('Error comparing models: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, comparing: false }));
    }
  };

  const handleMaterialChange = (type, property, value) => {
    setMaterialSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [property]: value
      }
    }));
  };

  // Add effect to recalculate comparisons when material settings change
useEffect(() => {
  if (originalModel?.model && modifiedModel?.model) {
    compareModels();
  }
}, [originalModel, modifiedModel, materialSettings]); // Add materialSettings as dependency


  const formatDifference = (value) => {
    // Check if value is undefined or not a number
    if (value === undefined || isNaN(value)) {
      return '0.00%';
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-center mb-4">Mechanical Part Comparison</h1>
      <p className="text-center text-gray-600 mb-8">
        Upload two mechanical part models (.stl format) to compare their geometry and dimensions
      </p>

      {error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-center gap-8 mb-8">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Original Part</h2>
          <CADFileUploader
            type="original"
            onFileLoad={(file, fileContent) => handleFileLoad(file, fileContent, 'original')}
            disabled={loading.original}
          />
        </div>

        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Modified Part</h2>
          <CADFileUploader
            type="modified"
            onFileLoad={(file, fileContent) => handleFileLoad(file, fileContent, 'modified')}
            disabled={loading.modified}
          />
        </div>
      </div>

       {/* Material Settings Cards */}
       <div className="flex justify-center gap-8 mb-8">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Original Part Material</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Material Name</label>
              <input
                type="text"
                value={materialSettings.original.name}
                onChange={(e) => handleMaterialChange('original', 'name', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={materialSettings.original.color}
                onChange={(e) => handleMaterialChange('original', 'color', e.target.value)}
                className="w-full"
              />
            </div>
            {Object.entries(MATERIAL_PROPERTIES).map(([key, prop]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {prop.name} {prop.unit && `(${prop.unit})`}
                </label>
                <input
                  type="range"
                  min={prop.range[0]}
                  max={prop.range[1]}
                  step={(prop.range[1] - prop.range[0]) / 100}
                  value={materialSettings.original[key]}
                  onChange={(e) => handleMaterialChange('original', key, parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm">{materialSettings.original[key].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Modified Part Material</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Material Name</label>
              <input
                type="text"
                value={materialSettings.modified.name}
                onChange={(e) => handleMaterialChange('modified', 'name', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={materialSettings.modified.color}
                onChange={(e) => handleMaterialChange('modified', 'color', e.target.value)}
                className="w-full"
              />
            </div>
            {Object.entries(MATERIAL_PROPERTIES).map(([key, prop]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {prop.name} {prop.unit && `(${prop.unit})`}
                </label>
                <input
                  type="range"
                  min={prop.range[0]}
                  max={prop.range[1]}
                  step={(prop.range[1] - prop.range[0]) / 100}
                  value={materialSettings.modified[key]}
                  onChange={(e) => handleMaterialChange('modified', key, parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm">{materialSettings.modified[key].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>


      {/* Comparison Results */}
      {compareResults && (
        <Card className="max-w-2xl mx-auto mb-8 p-6">
          <h3 className="text-xl font-semibold mb-4">Comparison Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Geometry Changes</h4>
              <ul className="space-y-2">
                <li>Vertices: {formatDifference(compareResults.vertexDiff)}</li>
                <li>Faces: {formatDifference(compareResults.faceDiff)}</li>
                <li>Volume: {formatDifference(compareResults.volumeDiff)}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Dimensional Changes</h4>
              <ul className="space-y-2">
                <li>Width (X): {formatDifference(compareResults.dimensionDiff.x)}</li>
                <li>Height (Y): {formatDifference(compareResults.dimensionDiff.y)}</li>
                <li>Depth (Z): {formatDifference(compareResults.dimensionDiff.z)}</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Material Comparison Results */}
      {compareResults?.materialDiffs && (
        <Card className="max-w-2xl mx-auto mb-8 p-6">
          <h3 className="text-xl font-semibold mb-4">Material Changes</h3>
          <div className="space-y-2">
            <p>Color: {compareResults.materialDiffs.colorDiff ? 'Changed' : 'No change'}</p>
            <p>Metallic: {formatDifference(compareResults.materialDiffs.metallicDiff)}</p>
            <p>Roughness: {formatDifference(compareResults.materialDiffs.roughnessDiff)}</p>
            <p>Density: {formatDifference(compareResults.materialDiffs.densityDiff)}</p>
            <p>Elastic Modulus: {formatDifference(compareResults.materialDiffs.elasticModulusDiff)}</p>
            <p>Thermal Conductivity: {formatDifference(compareResults.materialDiffs.thermalConductivityDiff)}</p>
          </div>
        </Card>
      )}

      

      <div className="flex flex-wrap justify-center gap-8">
        <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-2">Original Part</h3>
          {originalModel ? (
            <>
              <ModelViewer
                width={500}
                height={500}
                modelData={originalModel.model}
              />
              <div className="mt-4 text-sm">
                <p>Vertices: {originalModel.stats.vertices}</p>
                <p>Faces: {originalModel.stats.faces}</p>
              </div>
            </>
          ) : (
            <div className="w-[500px] h-[500px] bg-gray-100 flex items-center justify-center border border-gray-200 rounded">
              <p className="text-gray-500">Upload original part model</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-2">Modified Part</h3>
          {modifiedModel ? (
            <>
              <ModelViewer
                width={500}
                height={500}
                modelData={modifiedModel.model}
              />
              <div className="mt-4 text-sm">
                <p>Vertices: {modifiedModel.stats.vertices}</p>
                <p>Faces: {modifiedModel.stats.faces}</p>
              </div>
            </>
          ) : (
            <div className="w-[500px] h-[500px] bg-gray-100 flex items-center justify-center border border-gray-200 rounded">
              <p className="text-gray-500">Upload modified part model</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}