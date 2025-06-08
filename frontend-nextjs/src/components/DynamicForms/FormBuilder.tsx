import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useFormBuilder } from '../../hooks/useFormBuilder';
import { FieldDefinition, FormTemplate } from '../../types/dynamicForms';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';

interface FormBuilderProps {
  templateId?: string;
  onSave?: (template: FormTemplate) => void;
  onCancel?: () => void;
}

const fieldTypes = [
  { value: 'TEXT', label: 'Text Input', icon: '📝' },
  { value: 'TEXTAREA', label: 'Text Area', icon: '📄' },
  { value: 'EMAIL', label: 'Email', icon: '📧' },
  { value: 'PHONE', label: 'Phone', icon: '📞' },
  { value: 'NUMBER', label: 'Number', icon: '🔢' },
  { value: 'DATE', label: 'Date', icon: '📅' },
  { value: 'DATETIME', label: 'Date & Time', icon: '🕐' },
  { value: 'SELECT', label: 'Dropdown', icon: '📋' },
  { value: 'MULTISELECT', label: 'Multi-Select', icon: '☑️' },
  { value: 'RADIO', label: 'Radio Buttons', icon: '🔘' },
  { value: 'CHECKBOX', label: 'Checkboxes', icon: '☑️' },
  { value: 'BOOLEAN', label: 'Yes/No', icon: '✅' },
  { value: 'FILE', label: 'File Upload', icon: '📎' },
  { value: 'SIGNATURE', label: 'Digital Signature', icon: '✍️' },
  { value: 'RATING', label: 'Rating', icon: '⭐' },
  { value: 'SLIDER', label: 'Slider', icon: '🎚️' }
];

const FormBuilder: React.FC<FormBuilderProps> = ({
  templateId,
  onSave,
  onCancel
}) => {
  const {
    template,
    fields,
    loading,
    error,
    createTemplate,
    updateTemplate,
    addField,
    updateField,
    removeField,
    reorderFields
  } = useFormBuilder(templateId);

  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'personnel'
  });

  useEffect(() => {
    if (template) {
      setTemplateData({
        name: template.name,
        description: template.description || '',
        category: template.category
      });
    }
  }, [template]);

  const handleAddField = (fieldType: string) => {
    const newField: Partial<FieldDefinition> = {
      name: `field_${Date.now()}`,
      label: `New ${fieldType} Field`,
      fieldType: fieldType as any,
      dataType: getDataTypeForFieldType(fieldType),
      category: 'custom',
      isRequired: false,
      isVisible: true,
      isEditable: true,
      displayOrder: fields.length
    };

    setSelectedField(newField as FieldDefinition);
    setIsFieldEditorOpen(true);
  };

  const handleEditField = (field: FieldDefinition) => {
    setSelectedField(field);
    setIsFieldEditorOpen(true);
  };

  const handleSaveField = async (fieldData: FieldDefinition) => {
    try {
      if (selectedField?.id) {
        await updateField(selectedField.id, fieldData);
      } else {
        await addField(fieldData);
      }
      setIsFieldEditorOpen(false);
      setSelectedField(null);
    } catch (error) {
      console.error('Failed to save field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await removeField(fieldId);
      } catch (error) {
        console.error('Failed to delete field:', error);
      }
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    try {
      await reorderFields(sourceIndex, destinationIndex);
    } catch (error) {
      console.error('Failed to reorder fields:', error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templatePayload = {
        ...templateData,
        fields: fields.map(field => ({
          id: field.id,
          name: field.name,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder
        }))
      };

      let savedTemplate;
      if (templateId) {
        savedTemplate = await updateTemplate(templateId, templatePayload);
      } else {
        savedTemplate = await createTemplate(templatePayload);
      }

      if (onSave) {
        onSave(savedTemplate);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const getDataTypeForFieldType = (fieldType: string): string => {
    const mapping: Record<string, string> = {
      'TEXT': 'STRING',
      'TEXTAREA': 'STRING',
      'EMAIL': 'EMAIL',
      'PHONE': 'PHONE',
      'NUMBER': 'NUMBER',
      'INTEGER': 'INTEGER',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'BOOLEAN': 'BOOLEAN',
      'SELECT': 'STRING',
      'MULTISELECT': 'ARRAY',
      'RADIO': 'STRING',
      'CHECKBOX': 'ARRAY',
      'FILE': 'BINARY',
      'JSON': 'JSON'
    };
    return mapping[fieldType] || 'STRING';
  };

  const getFieldIcon = (fieldType: string) => {
    const field = fieldTypes.find(ft => ft.value === fieldType);
    return field?.icon || '📝';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading form builder...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">
              {templateId ? 'Edit Form Template' : 'Create Form Template'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Build dynamic forms with drag-and-drop functionality
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={fields.length === 0}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveTemplate}
            >
              Save Template
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Field Library */}
        <Paper sx={{ width: 300, borderRadius: 0, borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Template Settings
            </Typography>
            
            <TextField
              fullWidth
              label="Template Name"
              value={templateData.name}
              onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={templateData.description}
              onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                value={templateData.category}
                label="Category"
                onChange={(e) => setTemplateData({ ...templateData, category: e.target.value })}
              >
                <MenuItem value="personnel">Personnel</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="incident">Incident</MenuItem>
                <MenuItem value="audit">Audit</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Field Library
            </Typography>
            
            <Grid container spacing={1}>
              {fieldTypes.map((fieldType) => (
                <Grid item xs={6} key={fieldType.value}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddField(fieldType.value)}
                    sx={{
                      p: 1,
                      minHeight: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5
                    }}
                  >
                    <Typography variant="h6">{fieldType.icon}</Typography>
                    <Typography variant="caption" textAlign="center">
                      {fieldType.label}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        {/* Center Panel - Form Builder */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Form Fields ({fields.length})
          </Typography>

          {fields.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No fields added yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add fields from the library on the left to start building your form
              </Typography>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="form-fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              mb: 1,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none'
                            }}
                          >
                            <CardContent sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box {...provided.dragHandleProps}>
                                  <DragIcon color="action" />
                                </Box>
                                
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h6">
                                      {getFieldIcon(field.fieldType)}
                                    </Typography>
                                    <Typography variant="subtitle1">
                                      {field.label}
                                    </Typography>
                                    {field.isRequired && (
                                      <Chip label="Required" size="small" color="error" />
                                    )}
                                    {field.isEncrypted && (
                                      <Tooltip title="Encrypted Field">
                                        <SecurityIcon fontSize="small" color="warning" />
                                      </Tooltip>
                                    )}
                                  </Box>
                                  <Typography variant="body2" color="textSecondary">
                                    {field.fieldType} • {field.name}
                                  </Typography>
                                  {field.description && (
                                    <Typography variant="caption" color="textSecondary">
                                      {field.description}
                                    </Typography>
                                  )}
                                </Box>

                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditField(field)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteField(field.id)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Box>
      </Box>

      {/* Field Editor Dialog */}
      <FieldEditor
        open={isFieldEditorOpen}
        field={selectedField}
        onSave={handleSaveField}
        onCancel={() => {
          setIsFieldEditorOpen(false);
          setSelectedField(null);
        }}
      />

      {/* Form Preview Dialog */}
      <FormPreview
        open={isPreviewOpen}
        template={{ ...templateData, fields } as any}
        onClose={() => setIsPreviewOpen(false)}
      />
    </Box>
  );
};

export default FormBuilder;
