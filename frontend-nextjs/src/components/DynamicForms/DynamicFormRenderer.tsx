import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Button,
  Chip,
  Rating,
  Slider,
  Alert,
  CircularProgress,
  Autocomplete,
  FormHelperText,
  FormLabel,
  Paper,
  Divider
} from '@mui/material';
import { DatePicker, DateTimePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FieldDefinition, FormTemplate } from '../../types/dynamicForms';
import FileUploadField from './FileUploadField';
import SignatureField from './SignatureField';
import LocationField from './LocationField';

interface DynamicFormRendererProps {
  template: FormTemplate;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  loading?: boolean;
  readOnly?: boolean;
  showFieldGroups?: boolean;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  template,
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  readOnly = false,
  showFieldGroups = true
}) => {
  const [validationSchema, setValidationSchema] = useState<any>(null);
  const [fieldGroups, setFieldGroups] = useState<Record<string, FieldDefinition[]>>({});

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    defaultValues: initialData
  });

  useEffect(() => {
    // Build validation schema from field definitions
    const schema = buildValidationSchema(template.fields);
    setValidationSchema(schema);

    // Group fields by groupName
    const groups = groupFieldsByGroup(template.fields);
    setFieldGroups(groups);

    // Reset form with initial data
    reset(initialData);
  }, [template, initialData, reset]);

  const buildValidationSchema = (fields: FieldDefinition[]) => {
    const schemaFields: Record<string, any> = {};

    fields.forEach(field => {
      let fieldSchema: any;

      // Base schema based on data type
      switch (field.dataType) {
        case 'STRING':
        case 'EMAIL':
        case 'URL':
        case 'PHONE':
          fieldSchema = yup.string();
          break;
        case 'NUMBER':
          fieldSchema = yup.number();
          break;
        case 'INTEGER':
          fieldSchema = yup.number().integer();
          break;
        case 'BOOLEAN':
          fieldSchema = yup.boolean();
          break;
        case 'DATE':
        case 'DATETIME':
          fieldSchema = yup.date();
          break;
        case 'ARRAY':
          fieldSchema = yup.array();
          break;
        default:
          fieldSchema = yup.mixed();
      }

      // Add required validation
      if (field.isRequired) {
        fieldSchema = fieldSchema.required(`${field.label} is required`);
      }

      // Add specific validations based on field type
      if (field.fieldType === 'EMAIL') {
        fieldSchema = fieldSchema.email('Invalid email format');
      }

      // Add custom validation rules
      if (field.validationRules) {
        const rules = field.validationRules as any;
        
        if (rules.minLength) {
          fieldSchema = fieldSchema.min(rules.minLength, `Minimum ${rules.minLength} characters required`);
        }
        
        if (rules.maxLength) {
          fieldSchema = fieldSchema.max(rules.maxLength, `Maximum ${rules.maxLength} characters allowed`);
        }
        
        if (rules.pattern) {
          fieldSchema = fieldSchema.matches(new RegExp(rules.pattern), rules.patternMessage || 'Invalid format');
        }
        
        if (rules.min !== undefined) {
          fieldSchema = fieldSchema.min(rules.min, `Minimum value is ${rules.min}`);
        }
        
        if (rules.max !== undefined) {
          fieldSchema = fieldSchema.max(rules.max, `Maximum value is ${rules.max}`);
        }
      }

      schemaFields[field.name] = fieldSchema;
    });

    return yup.object().shape(schemaFields);
  };

  const groupFieldsByGroup = (fields: FieldDefinition[]) => {
    const groups: Record<string, FieldDefinition[]> = {};
    
    fields
      .filter(field => field.isVisible !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .forEach(field => {
        const groupName = field.groupName || 'General';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(field);
      });

    return groups;
  };

  const renderField = (field: FieldDefinition) => {
    const fieldProps = {
      name: field.name,
      control,
      rules: { required: field.isRequired }
    };

    const commonProps = {
      label: field.label,
      fullWidth: true,
      disabled: readOnly || !field.isEditable,
      error: !!errors[field.name],
      helperText: errors[field.name]?.message || field.helpText,
      placeholder: field.placeholder
    };

    switch (field.fieldType) {
      case 'TEXT':
      case 'PASSWORD':
      case 'URL':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
                type={field.fieldType === 'PASSWORD' ? 'password' : 'text'}
              />
            )}
          />
        );

      case 'TEXTAREA':
      case 'RICH_TEXT':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
                multiline
                rows={field.fieldType === 'RICH_TEXT' ? 6 : 4}
              />
            )}
          />
        );

      case 'EMAIL':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
                type="email"
              />
            )}
          />
        );

      case 'PHONE':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
                type="tel"
              />
            )}
          />
        );

      case 'NUMBER':
      case 'INTEGER':
      case 'DECIMAL':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
                type="number"
                onChange={(e) => {
                  const value = field.fieldType === 'INTEGER' 
                    ? parseInt(e.target.value) 
                    : parseFloat(e.target.value);
                  controllerField.onChange(isNaN(value) ? '' : value);
                }}
              />
            )}
          />
        );

      case 'DATE':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Controller
              {...fieldProps}
              render={({ field: controllerField }) => (
                <DatePicker
                  {...controllerField}
                  label={field.label}
                  disabled={readOnly || !field.isEditable}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      {...commonProps}
                    />
                  )}
                />
              )}
            />
          </LocalizationProvider>
        );

      case 'DATETIME':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Controller
              {...fieldProps}
              render={({ field: controllerField }) => (
                <DateTimePicker
                  {...controllerField}
                  label={field.label}
                  disabled={readOnly || !field.isEditable}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      {...commonProps}
                    />
                  )}
                />
              )}
            />
          </LocalizationProvider>
        );

      case 'TIME':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Controller
              {...fieldProps}
              render={({ field: controllerField }) => (
                <TimePicker
                  {...controllerField}
                  label={field.label}
                  disabled={readOnly || !field.isEditable}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      {...commonProps}
                    />
                  )}
                />
              )}
            />
          </LocalizationProvider>
        );

      case 'SELECT':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <FormControl fullWidth error={!!errors[field.name]}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  {...controllerField}
                  label={field.label}
                  disabled={readOnly || !field.isEditable}
                >
                  {field.options?.map((option: any) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {(errors[field.name]?.message || field.helpText) && (
                  <FormHelperText>
                    {errors[field.name]?.message || field.helpText}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'MULTISELECT':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <Autocomplete
                {...controllerField}
                multiple
                options={field.options || []}
                getOptionLabel={(option: any) => option.label}
                isOptionEqualToValue={(option: any, value: any) => option.value === value.value}
                disabled={readOnly || !field.isEditable}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    {...commonProps}
                  />
                )}
                onChange={(_, value) => controllerField.onChange(value)}
              />
            )}
          />
        );

      case 'RADIO':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <FormControl component="fieldset" error={!!errors[field.name]}>
                <FormLabel component="legend">{field.label}</FormLabel>
                <RadioGroup
                  {...controllerField}
                  row={field.options && field.options.length <= 3}
                >
                  {field.options?.map((option: any) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                      disabled={readOnly || !field.isEditable}
                    />
                  ))}
                </RadioGroup>
                {(errors[field.name]?.message || field.helpText) && (
                  <FormHelperText>
                    {errors[field.name]?.message || field.helpText}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'CHECKBOX':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <FormControl component="fieldset" error={!!errors[field.name]}>
                <FormLabel component="legend">{field.label}</FormLabel>
                <Box>
                  {field.options?.map((option: any) => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          checked={controllerField.value?.includes(option.value) || false}
                          onChange={(e) => {
                            const currentValue = controllerField.value || [];
                            const newValue = e.target.checked
                              ? [...currentValue, option.value]
                              : currentValue.filter((v: any) => v !== option.value);
                            controllerField.onChange(newValue);
                          }}
                          disabled={readOnly || !field.isEditable}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </Box>
                {(errors[field.name]?.message || field.helpText) && (
                  <FormHelperText>
                    {errors[field.name]?.message || field.helpText}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'BOOLEAN':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <FormControlLabel
                control={
                  <Switch
                    {...controllerField}
                    checked={controllerField.value || false}
                    disabled={readOnly || !field.isEditable}
                  />
                }
                label={field.label}
              />
            )}
          />
        );

      case 'RATING':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <Box>
                <Typography component="legend">{field.label}</Typography>
                <Rating
                  {...controllerField}
                  disabled={readOnly || !field.isEditable}
                  max={field.validationRules?.max || 5}
                />
                {(errors[field.name]?.message || field.helpText) && (
                  <FormHelperText error={!!errors[field.name]}>
                    {errors[field.name]?.message || field.helpText}
                  </FormHelperText>
                )}
              </Box>
            )}
          />
        );

      case 'SLIDER':
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <Box sx={{ px: 2 }}>
                <Typography component="legend" gutterBottom>
                  {field.label}
                </Typography>
                <Slider
                  {...controllerField}
                  disabled={readOnly || !field.isEditable}
                  min={field.validationRules?.min || 0}
                  max={field.validationRules?.max || 100}
                  step={field.validationRules?.step || 1}
                  valueLabelDisplay="auto"
                  marks
                />
                {(errors[field.name]?.message || field.helpText) && (
                  <FormHelperText error={!!errors[field.name]}>
                    {errors[field.name]?.message || field.helpText}
                  </FormHelperText>
                )}
              </Box>
            )}
          />
        );

      case 'FILE':
      case 'IMAGE':
        return (
          <FileUploadField
            field={field}
            control={control}
            error={errors[field.name]}
            disabled={readOnly || !field.isEditable}
          />
        );

      case 'SIGNATURE':
        return (
          <SignatureField
            field={field}
            control={control}
            error={errors[field.name]}
            disabled={readOnly || !field.isEditable}
          />
        );

      case 'LOCATION':
        return (
          <LocationField
            field={field}
            control={control}
            error={errors[field.name]}
            disabled={readOnly || !field.isEditable}
          />
        );

      default:
        return (
          <Controller
            {...fieldProps}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                {...commonProps}
              />
            )}
          />
        );
    }
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    onSubmit(data);
  };

  if (!validationSchema) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {template.name}
          </Typography>
          {template.description && (
            <Typography variant="body2" color="textSecondary" paragraph>
              {template.description}
            </Typography>
          )}

          {showFieldGroups ? (
            Object.entries(fieldGroups).map(([groupName, groupFields]) => (
              <Box key={groupName} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {groupName}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {groupFields.map(field => (
                    <Grid item xs={12} sm={6} md={field.fieldType === 'TEXTAREA' ? 12 : 6} key={field.name}>
                      {renderField(field)}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))
          ) : (
            <Grid container spacing={2}>
              {template.fields
                .filter(field => field.isVisible !== false)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map(field => (
                  <Grid item xs={12} sm={6} md={field.fieldType === 'TEXTAREA' ? 12 : 6} key={field.name}>
                    {renderField(field)}
                  </Grid>
                ))}
            </Grid>
          )}

          {!readOnly && (
            <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
              {onCancel && (
                <Button onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DynamicFormRenderer;
