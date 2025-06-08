import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  IconButton,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiClient } from '../../utils/apiClient';

interface DocumentUploadProps {
  onUploadComplete?: (document: any) => void;
  onUploadError?: (error: string) => void;
  categories: any[];
  documentTypes: any[];
}

interface UploadFormData {
  title: string;
  description?: string;
  categoryId: string;
  typeId: string;
  securityLevel: string;
  tags: string[];
}

const uploadSchema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string(),
  categoryId: yup.string().required('Category is required'),
  typeId: yup.string().required('Document type is required'),
  securityLevel: yup.string().required('Security level is required'),
  tags: yup.array().of(yup.string())
});

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  onUploadError,
  categories,
  documentTypes
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTag, setNewTag] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<UploadFormData>({
    resolver: yupResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      typeId: '',
      securityLevel: 'INTERNAL',
      tags: []
    }
  });

  const watchedTags = watch('tags');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    
    // Auto-fill title from first file if empty
    if (acceptedFiles.length > 0 && !watch('title')) {
      const fileName = acceptedFiles[0].name;
      const titleWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      setValue('title', titleWithoutExtension);
    }
  }, [setValue, watch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue('tags', [...watchedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: UploadFormData) => {
    if (files.length === 0) {
      onUploadError?.('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        
        formData.append('file', file);
        formData.append('title', i === 0 ? data.title : `${data.title} (${i + 1})`);
        formData.append('description', data.description || '');
        formData.append('categoryId', data.categoryId);
        formData.append('typeId', data.typeId);
        formData.append('securityLevel', data.securityLevel);
        formData.append('tags', JSON.stringify(data.tags));

        const response = await apiClient.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i + (progressEvent.loaded / progressEvent.total!)) / files.length) * 100
            );
            setUploadProgress(progress);
          }
        });

        if (i === files.length - 1) {
          onUploadComplete?.(response.data.data);
        }
      }

      // Reset form
      setFiles([]);
      setValue('title', '');
      setValue('description', '');
      setValue('tags', []);
      setUploadProgress(0);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Documents
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* File Drop Zone */}
            <Grid item xs={12}>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 3,
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Supported formats: PDF, Word, Excel, Text, Images (Max 100MB per file)
                </Typography>
              </Paper>
            </Grid>

            {/* Selected Files */}
            {files.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({files.length})
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {files.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <FileIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Document Information */}
            <Grid item xs={12} md={6}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Document Title"
                    fullWidth
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    disabled={uploading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="securityLevel"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.securityLevel}>
                    <InputLabel>Security Level</InputLabel>
                    <Select
                      {...field}
                      label="Security Level"
                      disabled={uploading}
                    >
                      <MenuItem value="PUBLIC">Public</MenuItem>
                      <MenuItem value="INTERNAL">Internal</MenuItem>
                      <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                      <MenuItem value="RESTRICTED">Restricted</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.categoryId}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      {...field}
                      label="Category"
                      disabled={uploading}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="typeId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.typeId}>
                    <InputLabel>Document Type</InputLabel>
                    <Select
                      {...field}
                      label="Document Type"
                      disabled={uploading}
                    >
                      {documentTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    disabled={uploading}
                  />
                )}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {watchedTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => removeTag(tag)}
                    disabled={uploading}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  disabled={uploading}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={addTag}
                  disabled={!newTag.trim() || uploading}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
            </Grid>

            {/* Upload Progress */}
            {uploading && (
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uploading... {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={files.length === 0 || uploading}
                  startIcon={<UploadIcon />}
                >
                  {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
