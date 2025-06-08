import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FieldDefinition } from '../../types/dynamicForms';

interface FieldEditorProps {
  open: boolean;
  field?: FieldDefinition | null;
  onSave: (field: FieldDefinition) => void;
  onCancel: () => void;
}

const validationSchema = yup.object({
  name: yup.string().required('Field name is required').matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid field name format'),
  label: yup.string().required('Field label is required'),
  fieldType: yup.string().required('Field type is required'),
  dataType: yup.string().required('Data type is required'),
  category: yup.string().required('Category is required')
});

const fieldTypes = [
  'TEXT', 'TEXTAREA', 'EMAIL', 'PASSWORD', 'URL', 'PHONE', 'NUMBER', 'INTEGER', 'DECIMAL',
  'BOOLEAN', 'DATE', 'DATETIME', 'TIME', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX',
  'FILE', 'IMAGE', 'JSON', 'ARRAY', 'OBJECT', 'ENCRYPTED_TEXT', 'SIGNATURE', 'LOCATION',
  'COLOR', 'RATING', 'SLIDER', 'RICH_TEXT', 'CODE', 'BARCODE', 'QR_CODE'
];

const dataTypes = [
  'STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'ARRAY',
  'OBJECT', 'BINARY', 'UUID', 'EMAIL', 'URL', 'PHONE', 'ENCRYPTED'
];

const gdprCategories = [
  'PERSONAL_IDENTIFIERS', 'CONTACT_INFORMATION', 'DEMOGRAPHIC_DATA', 'EMPLOYMENT_DATA',
  'FINANCIAL_DATA', 'HEALTH_DATA', 'BIOMETRIC_DATA', 'BEHAVIORAL_DATA', 'TECHNICAL_DATA',
  'USAGE_DATA', 'LOCATION_DATA', 'COMMUNICATION_DATA', 'PREFERENCE_DATA', 'CONSENT_DATA'
];

const FieldEditor: React.FC<FieldEditorProps> = ({
  open,
  field,
  onSave,
  onCancel
}) => {
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['basic']);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: '',
      label: '',
      description: '',
      category: 'custom',
      fieldType: 'TEXT',
      dataType: 'STRING',
      isRequired: false,
      isEncrypted: false,
      isSearchable: true,
      isFilterable: true,
      isSortable: true,
      isVisible: true,
      isEditable: true,
      displayOrder: 0,
      placeholder: '',
      helpText: '',
      groupName: '',
      defaultValue: '',
      isPersonalData: false,
      gdprCategory: '',
      retentionPeriod: 0,
      options: [],
      validationRules: {},
      conditionalLogic: {},
      dependencies: []
    }
  });

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption
  } = useFieldArray({
    control,
    name: 'options'
  });

  const watchFieldType = watch('fieldType');
  const watchIsPersonalData = watch('isPersonalData');

  useEffect(() => {
    if (field) {
      reset({
        name: field.name || '',
        label: field.label || '',
        description: field.description || '',
        category: field.category || 'custom',
        fieldType: field.fieldType || 'TEXT',
        dataType: field.dataType || 'STRING',
        isRequired: field.isRequired || false,
        isEncrypted: field.isEncrypted || false,
        isSearchable: field.isSearchable !== false,
        isFilterable: field.isFilterable !== false,
        isSortable: field.isSortable !== false,
        isVisible: field.isVisible !== false,
        isEditable: field.isEditable !== false,
        displayOrder: field.displayOrder || 0,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        groupName: field.groupName || '',
        defaultValue: field.defaultValue || '',
        isPersonalData: field.isPersonalData || false,
        gdprCategory: field.gdprCategory || '',
        retentionPeriod: field.retentionPeriod || 0,
        options: field.options || [],
        validationRules: field.validationRules || {},
        conditionalLogic: field.conditionalLogic || {},
        dependencies: field.dependencies || []
      });
    } else {
      reset();
    }
  }, [field, reset]);

  // Auto-update data type based on field type
  useEffect(() => {
    const dataTypeMapping: Record<string, string> = {
      'TEXT': 'STRING',
      'TEXTAREA': 'STRING',
      'EMAIL': 'EMAIL',
      'PHONE': 'PHONE',
      'URL': 'URL',
      'NUMBER': 'NUMBER',
      'INTEGER': 'INTEGER',
      'DECIMAL': 'NUMBER',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'TIME': 'STRING',
      'SELECT': 'STRING',
      'MULTISELECT': 'ARRAY',
      'RADIO': 'STRING',
      'CHECKBOX': 'ARRAY',
      'FILE': 'BINARY',
      'IMAGE': 'BINARY',
      'JSON': 'JSON',
      'ARRAY': 'ARRAY',
      'OBJECT': 'OBJECT',
      'ENCRYPTED_TEXT': 'ENCRYPTED'
    };

    if (dataTypeMapping[watchFieldType]) {
      setValue('dataType', dataTypeMapping[watchFieldType]);
    }
  }, [watchFieldType, setValue]);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanels(prev => 
      isExpanded 
        ? [...prev, panel]
        : prev.filter(p => p !== panel)
    );
  };

  const handleAddOption = () => {
    appendOption({ label: '', value: '' });
  };

  const handleFormSubmit = (data: any) => {
    const fieldData: FieldDefinition = {
      ...field,
      ...data,
      id: field?.id || undefined
    };
    onSave(fieldData);
  };

  const needsOptions = ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(watchFieldType);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon />
          {field?.id ? 'Edit Field' : 'Create Field'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Basic Settings */}
          <Accordion 
            expanded={expandedPanels.includes('basic')} 
            onChange={handlePanelChange('basic')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Basic Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Field Name"
                        fullWidth
                        required
                        error={!!errors.name}
                        helperText={errors.name?.message || 'Unique identifier for the field'}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="label"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Display Label"
                        fullWidth
                        required
                        error={!!errors.label}
                        helperText={errors.label?.message || 'Label shown to users'}
                      />
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
                        rows={2}
                        helperText="Optional description of the field"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required>
                        <InputLabel>Category</InputLabel>
                        <Select {...field} label="Category">
                          <MenuItem value="personal">Personal</MenuItem>
                          <MenuItem value="employment">Employment</MenuItem>
                          <MenuItem value="contact">Contact</MenuItem>
                          <MenuItem value="custom">Custom</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="fieldType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required>
                        <InputLabel>Field Type</InputLabel>
                        <Select {...field} label="Field Type">
                          {fieldTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="dataType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required>
                        <InputLabel>Data Type</InputLabel>
                        <Select {...field} label="Data Type">
                          {dataTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Field Options */}
          {needsOptions && (
            <Accordion 
              expanded={expandedPanels.includes('options')} 
              onChange={handlePanelChange('options')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Field Options</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddOption}
                    variant="outlined"
                    size="small"
                  >
                    Add Option
                  </Button>
                </Box>
                {optionFields.map((option, index) => (
                  <Grid container spacing={2} key={option.id} sx={{ mb: 1 }}>
                    <Grid item xs={5}>
                      <Controller
                        name={`options.${index}.label`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Label"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <Controller
                        name={`options.${index}.value`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Value"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton
                        onClick={() => removeOption(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Validation & Behavior */}
          <Accordion 
            expanded={expandedPanels.includes('validation')} 
            onChange={handlePanelChange('validation')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Validation & Behavior</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isRequired"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Required Field"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isVisible"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Visible"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isEditable"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Editable"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isSearchable"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Searchable"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="placeholder"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Placeholder Text"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="defaultValue"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Default Value"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="helpText"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Help Text"
                        fullWidth
                        multiline
                        rows={2}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* GDPR & Security */}
          <Accordion 
            expanded={expandedPanels.includes('gdpr')} 
            onChange={handlePanelChange('gdpr')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                <Typography variant="h6">GDPR & Security</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isPersonalData"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Contains Personal Data"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="isEncrypted"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Encrypt Field Data"
                      />
                    )}
                  />
                </Grid>
                {watchIsPersonalData && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="gdprCategory"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>GDPR Data Category</InputLabel>
                            <Select {...field} label="GDPR Data Category">
                              {gdprCategories.map(category => (
                                <MenuItem key={category} value={category}>
                                  {category.replace(/_/g, ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="retentionPeriod"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Retention Period (days)"
                            type="number"
                            fullWidth
                            helperText="How long to retain this data"
                          />
                        )}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
        >
          {field?.id ? 'Update Field' : 'Create Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldEditor;
