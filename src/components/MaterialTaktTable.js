import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, X, Plus, Upload } from 'lucide-react';

const MaterialTaktTable = ({ 
  materials, 
  onAddMaterial, 
  onEditMaterial, 
  onDeleteMaterial,
  onImportMaterials,
  permissions = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const handleImport = () => {
    try {
      const count = onImportMaterials(pasteData);
      setPasteData('');
      setShowPasteDialog(false);
      alert(`成功导入 ${count} 条物料数据`);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="border-b bg-gray-25">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            物料生产节拍表
            <span className="ml-2 text-sm text-gray-500">
              ({materials.length}种物料)
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            {isExpanded && (
              <>
                {permissions.canAdd && onAddMaterial && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddMaterial();
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加物料
                  </button>
                )}
                {permissions.canImport && onImportMaterials && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPasteDialog(true);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    导入数据
                  </button>
                )}
              </>
            )}
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-600 mb-3">
            提示：可以从Excel复制数据（按列：种类、特征、型号/厚度、实际节拍）然后粘贴导入
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">种类</th>
                  <th className="p-2 text-left">特征</th>
                  <th className="p-2 text-left">型号/厚度</th>
                  <th className="p-2 text-left">实际节拍(秒/件)</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{material.category}</td>
                    <td className="p-2">{material.feature}</td>
                    <td className="p-2">{material.modelThickness}</td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {material.actualTakt}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-1">
                        {permissions.canEdit && onEditMaterial && (
                          <button
                            onClick={() => onEditMaterial(material)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canDelete && onDeleteMaterial && (
                          <button
                            onClick={() => onDeleteMaterial(material.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="删除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 粘贴导入弹窗 */}
      {showPasteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">导入物料数据</h3>
            <div className="text-sm text-gray-600 mb-3">
              请粘贴Excel数据（种类、特征、型号/厚度、实际节拍）：
            </div>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              className="w-full h-32 p-2 border rounded"
              placeholder="从Excel复制数据后粘贴到这里..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowPasteDialog(false);
                  setPasteData('');
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialTaktTable;
