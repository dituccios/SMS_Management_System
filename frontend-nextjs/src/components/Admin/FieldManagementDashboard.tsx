import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  Integration as IntegrationIcon,
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useDynamicFields } from '../../hooks/useFormBuilder';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { useIntegrations } from '../../hooks/useIntegrations';
import { FieldDefinition, SystemConfiguration, Integration } from '../../types/dynamicForms';
import FormBuilder from '../DynamicForms/FormBuilder';
import FieldEditor from '../DynamicForms/FieldEditor';
import SystemConfigEditor from './SystemConfigEditor';
import IntegrationManager from './IntegrationManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const FieldManagementDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    fields,
    loading: fieldsLoading,
    error: fieldsError,
    createField,
    updateField,
    deleteField,
    getFieldsByCategory
  } = useDynamicFields();

  const {
    configurations,
    loading: configLoading,
    error: configError,
    getConfigsByCategory
  } = useSystemConfig();

  const {
    integrations,
    loading: integrationsLoading,
    error: integrationsError
  } = useIntegrations();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreateField = () => {
    setSelectedField(null);
    setIsFieldEditorOpen(true);
  };

  const handleEditField = (field: FieldDefinition) => {
    setSelectedField(field);
    setIsFieldEditorOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteField = async (field: FieldDefinition) => {
    if (window.confirm(`Are you sure you want to delete the field "${field.label}"?`)) {
      try {
        await deleteField(field.id);
        setAnchorEl(null);
      } catch (error) {
        console.error('Failed to delete field:', error);
      }
    }
  };

  const handleSaveField = async (fieldData: FieldDefinition) => {
    try {
      if (selectedField?.id) {
        await updateField(selectedField.id, fieldData);
      } else {
        await createField(fieldData);
      }
      setIsFieldEditorOpen(false);
      setSelectedField(null);
    } catch (error) {
      console.error('Failed to save field:', error);
    }
  };

  const filteredFields = fields.filter(field => {
    const matchesCategory = !filterCategory || field.category === filterCategory;
    const matchesSearch = !searchTerm || 
      field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const fieldCategories = [...new Set(fields.map(field => field.category))];

  const getFieldTypeIcon = (fieldType: string) => {
    const icons: Record<string, string> = {
      'TEXT': '📝',
      'EMAIL': '📧',
      'PHONE': '📞',
      'NUMBER': '🔢',
      'DATE': '📅',
      'SELECT': '📋',
      'BOOLEAN': '✅',
      'FILE': '📎',
      'SIGNATURE': '✍️'
    };
    return icons[fieldType] || '📝';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Administration
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage dynamic fields, forms, configurations, and integrations
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="admin tabs">
          <Tab 
            icon={<StorageIcon />} 
            label="Field Management" 
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          <Tab 
            icon={<BuildIcon />} 
            label="Form Builder" 
            id="admin-tab-1"
            aria-controls="admin-tabpanel-1"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="System Config" 
            id="admin-tab-2"
            aria-controls="admin-tabpanel-2"
          />
          <Tab 
            icon={<IntegrationIcon />} 
            label="Integrations" 
            id="admin-tab-3"
            aria-controls="admin-tabpanel-3"
          />
          <Tab 
            icon={<AssessmentIcon />} 
            label="Analytics" 
            id="admin-tab-4"
            aria-controls="admin-tabpanel-4"
          />
        </Tabs>
      </Box>

      {/* Field Management Tab */}
      <TabPanel value={currentTab} index={0}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Search Fields"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {fieldCategories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateField}
              >
                Create Field
              </Button>
            </Grid>
          </Grid>
        </Box>

        {fieldsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fieldsError}
          </Alert>
        )}

        {fieldsLoading && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Field</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Security</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">
                        {getFieldTypeIcon(field.fieldType)}
                      </Typography>
                      <Box>
                        <Typography variant="subtitle2">
                          {field.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {field.name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={field.fieldType} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={field.category} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={field.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(field.isActive) as any}
                        size="small"
                      />
                      {field.isRequired && (
                        <Chip label="Required" color="error" size="small" />
                      )}
                      {!field.isVisible && (
                        <Tooltip title="Hidden Field">
                          <VisibilityOffIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {field.isEncrypted && (
                        <Tooltip title="Encrypted">
                          <SecurityIcon fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                      {field.isPersonalData && (
                        <Tooltip title="Personal Data">
                          <Badge color="error" variant="dot">
                            <SecurityIcon fontSize="small" color="info" />
                          </Badge>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(field.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setSelectedField(field);
                        setAnchorEl(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Field Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => handleEditField(selectedField!)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Field
          </MenuItem>
          <MenuItem onClick={() => handleDeleteField(selectedField!)}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Field
          </MenuItem>
        </Menu>
      </TabPanel>

      {/* Form Builder Tab */}
      <TabPanel value={currentTab} index={1}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dynamic Form Builder
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Create and manage dynamic forms using the available field definitions
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<BuildIcon />}
            onClick={() => setIsFormBuilderOpen(true)}
          >
            Open Form Builder
          </Button>
        </Box>
      </TabPanel>

      {/* System Configuration Tab */}
      <TabPanel value={currentTab} index={2}>
        <SystemConfigEditor configurations={configurations} loading={configLoading} error={configError} />
      </TabPanel>

      {/* Integrations Tab */}
      <TabPanel value={currentTab} index={3}>
        <IntegrationManager integrations={integrations} loading={integrationsLoading} error={integrationsError} />
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{fields.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Fields
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="warning" />
                  <Box>
                    <Typography variant="h6">
                      {fields.filter(f => f.isEncrypted).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Encrypted Fields
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="info" />
                  <Box>
                    <Typography variant="h6">{configurations.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Configurations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IntegrationIcon color="success" />
                  <Box>
                    <Typography variant="h6">
                      {integrations.filter(i => i.isEnabled).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Integrations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

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

      {/* Form Builder Dialog */}
      <Dialog
        open={isFormBuilderOpen}
        onClose={() => setIsFormBuilderOpen(false)}
        maxWidth="xl"
        fullWidth
        fullScreen
      >
        <DialogTitle>
          Form Builder
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FormBuilder
            onSave={() => setIsFormBuilderOpen(false)}
            onCancel={() => setIsFormBuilderOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FieldManagementDashboard;
