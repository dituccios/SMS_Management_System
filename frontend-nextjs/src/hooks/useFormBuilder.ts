import { useState, useEffect, useCallback } from 'react';
import { FieldDefinition, FormTemplate, UseFormBuilderReturn } from '../types/dynamicForms';
import { apiClient } from '../utils/apiClient';

export const useFormBuilder = (templateId?: string): UseFormBuilderReturn => {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template and fields
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      // Initialize empty template
      setTemplate(null);
      setFields([]);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/persona-management/forms/${id}`);
      const templateData = response.data.data;

      setTemplate(templateData);
      setFields(templateData.fields || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = useCallback(async (data: Partial<FormTemplate>): Promise<FormTemplate> => {
    try {
      setLoading(true);
      setError(null);

      const templateData = {
        ...data,
        fields: fields.map(field => ({
          id: field.id,
          name: field.name,
          label: field.label,
          fieldType: field.fieldType,
          dataType: field.dataType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          isVisible: field.isVisible,
          isEditable: field.isEditable
        }))
      };

      const response = await apiClient.post('/persona-management/forms', templateData);
      const newTemplate = response.data.data;

      setTemplate(newTemplate);
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fields]);

  const updateTemplate = useCallback(async (id: string, data: Partial<FormTemplate>): Promise<FormTemplate> => {
    try {
      setLoading(true);
      setError(null);

      const templateData = {
        ...data,
        fields: fields.map(field => ({
          id: field.id,
          name: field.name,
          label: field.label,
          fieldType: field.fieldType,
          dataType: field.dataType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          isVisible: field.isVisible,
          isEditable: field.isEditable
        }))
      };

      const response = await apiClient.put(`/persona-management/forms/${id}`, templateData);
      const updatedTemplate = response.data.data;

      setTemplate(updatedTemplate);
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fields]);

  const addField = useCallback(async (field: FieldDefinition): Promise<FieldDefinition> => {
    try {
      setError(null);

      // Create field definition first
      const fieldData = {
        ...field,
        displayOrder: fields.length
      };

      const response = await apiClient.post('/persona-management/fields', fieldData);
      const newField = response.data.data;

      // Add to local state
      setFields(prev => [...prev, newField]);

      return newField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fields]);

  const updateField = useCallback(async (id: string, fieldData: Partial<FieldDefinition>): Promise<FieldDefinition> => {
    try {
      setError(null);

      const response = await apiClient.put(`/persona-management/fields/${id}`, fieldData);
      const updatedField = response.data.data;

      // Update local state
      setFields(prev => prev.map(field => 
        field.id === id ? { ...field, ...updatedField } : field
      ));

      return updatedField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const removeField = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      await apiClient.delete(`/persona-management/fields/${id}`);

      // Remove from local state
      setFields(prev => prev.filter(field => field.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const reorderFields = useCallback(async (sourceIndex: number, destinationIndex: number): Promise<void> => {
    try {
      setError(null);

      // Update local state immediately for better UX
      const newFields = Array.from(fields);
      const [reorderedField] = newFields.splice(sourceIndex, 1);
      newFields.splice(destinationIndex, 0, reorderedField);

      // Update display order
      const updatedFields = newFields.map((field, index) => ({
        ...field,
        displayOrder: index
      }));

      setFields(updatedFields);

      // Update each field's display order on the server
      const updatePromises = updatedFields.map(field =>
        apiClient.put(`/persona-management/fields/${field.id}`, {
          displayOrder: field.displayOrder
        })
      );

      await Promise.all(updatePromises);
    } catch (err) {
      // Revert local state on error
      if (templateId) {
        loadTemplate(templateId);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder fields';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fields, templateId]);

  return {
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
  };
};

export const useDynamicFields = (category?: string) => {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFields();
  }, [category]);

  const loadFields = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = category ? { category } : {};
      const response = await apiClient.get('/persona-management/fields', { params });
      
      setFields(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const createField = useCallback(async (data: Partial<FieldDefinition>): Promise<FieldDefinition> => {
    try {
      setError(null);

      const response = await apiClient.post('/persona-management/fields', data);
      const newField = response.data.data;

      setFields(prev => [...prev, newField]);
      return newField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateField = useCallback(async (id: string, data: Partial<FieldDefinition>): Promise<FieldDefinition> => {
    try {
      setError(null);

      const response = await apiClient.put(`/persona-management/fields/${id}`, data);
      const updatedField = response.data.data;

      setFields(prev => prev.map(field => 
        field.id === id ? { ...field, ...updatedField } : field
      ));

      return updatedField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteField = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      await apiClient.delete(`/persona-management/fields/${id}`);
      setFields(prev => prev.filter(field => field.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete field';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getFieldsByCategory = useCallback((categoryFilter: string): FieldDefinition[] => {
    return fields.filter(field => field.category === categoryFilter);
  }, [fields]);

  return {
    fields,
    loading,
    error,
    createField,
    updateField,
    deleteField,
    getFieldsByCategory,
    refreshFields: loadFields
  };
};

export const useFormSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitForm = useCallback(async (
    templateId: string,
    data: Record<string, any>
  ): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/persona-management/forms/${templateId}/submit`, {
        submissionData: data
      });

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubmissions = useCallback(async (templateId: string): Promise<any[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/persona-management/forms/${templateId}/submissions`);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get submissions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitForm,
    getSubmissions
  };
};
