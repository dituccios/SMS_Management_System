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
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { usePersonaManagement } from '../../hooks/usePersonaManagement';
import { PersonaProfile, PersonaStatus, EmploymentType } from '../../types/persona';
import PersonaForm from './PersonaForm';
import ConsentManagement from './ConsentManagement';
import { formatDate, formatEmploymentType, formatPersonaStatus } from '../../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`persona-tabpanel-${index}`}
      aria-labelledby={`persona-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PersonaManagement: React.FC = () => {
  const {
    personas,
    loading,
    error,
    createPersona,
    updatePersona,
    deletePersona,
    exportPersonaData,
    anonymizePersona
  } = usePersonaManagement();

  const [currentTab, setCurrentTab] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PersonaStatus | 'ALL'>('ALL');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    action: () => {}
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreatePersona = () => {
    setSelectedPersona(null);
    setIsFormOpen(true);
  };

  const handleEditPersona = (persona: PersonaProfile) => {
    setSelectedPersona(persona);
    setIsFormOpen(true);
    setAnchorEl(null);
  };

  const handleDeletePersona = (persona: PersonaProfile) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Persona',
      message: `Are you sure you want to delete ${persona.firstName} ${persona.lastName}? This action will anonymize their data and cannot be undone.`,
      action: () => handleConfirmDelete(persona.id)
    });
    setAnchorEl(null);
  };

  const handleConfirmDelete = async (personaId: string) => {
    try {
      await deletePersona(personaId, 'User requested deletion');
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error('Failed to delete persona:', error);
    }
  };

  const handleExportData = async (persona: PersonaProfile) => {
    try {
      await exportPersonaData(persona.id);
      setAnchorEl(null);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleManageConsent = (persona: PersonaProfile) => {
    setSelectedPersona(persona);
    setIsConsentOpen(true);
    setAnchorEl(null);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedPersona) {
        await updatePersona(selectedPersona.id, data);
      } else {
        await createPersona(data);
      }
      setIsFormOpen(false);
      setSelectedPersona(null);
    } catch (error) {
      console.error('Failed to save persona:', error);
    }
  };

  const filteredPersonas = personas.filter(persona => {
    const matchesSearch = 
      persona.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (persona.employeeId && persona.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || persona.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: PersonaStatus) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'SUSPENDED': return 'warning';
      case 'TERMINATED': return 'error';
      case 'ON_LEAVE': return 'info';
      default: return 'default';
    }
  };

  const maskEmail = (email: string) => {
    if (showSensitiveData) return email;
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***${local.slice(-1)}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (showSensitiveData) return phone;
    return phone ? '***-***-' + phone.slice(-4) : '';
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Personnel Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showSensitiveData}
                onChange={(e) => setShowSensitiveData(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showSensitiveData ? <VisibilityIcon /> : <VisibilityOffIcon />}
                Show Sensitive Data
              </Box>
            }
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePersona}
          >
            Add Personnel
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab icon={<PersonIcon />} label="Personnel" />
          <Tab icon={<AssignmentIcon />} label="Training Records" />
          <Tab icon={<SchoolIcon />} label="Certifications" />
          <Tab icon={<SecurityIcon />} label="Compliance" />
        </Tabs>
      </Box>

      {/* Personnel Tab */}
      <TabPanel value={currentTab} index={0}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Search Personnel"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as PersonaStatus | 'ALL')}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
              <MenuItem value="TERMINATED">Terminated</MenuItem>
              <MenuItem value="ON_LEAVE">On Leave</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Personnel Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Employment Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>GDPR Consent</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPersonas.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell>{persona.employeeId || 'N/A'}</TableCell>
                  <TableCell>
                    {showSensitiveData 
                      ? `${persona.firstName} ${persona.lastName}`
                      : `${persona.firstName.charAt(0)}*** ${persona.lastName.charAt(0)}***`
                    }
                  </TableCell>
                  <TableCell>{maskEmail(persona.email)}</TableCell>
                  <TableCell>{persona.department || 'N/A'}</TableCell>
                  <TableCell>{persona.position || 'N/A'}</TableCell>
                  <TableCell>{formatEmploymentType(persona.employmentType)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatPersonaStatus(persona.status)}
                      color={getStatusColor(persona.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={persona.dataProcessingConsent ? 'Granted' : 'Not Granted'}
                      color={persona.dataProcessingConsent ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setSelectedPersona(persona);
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
      </TabPanel>

      {/* Training Records Tab */}
      <TabPanel value={currentTab} index={1}>
        <Typography variant="h6">Training Records</Typography>
        <Typography color="textSecondary">
          Training records management will be implemented here.
        </Typography>
      </TabPanel>

      {/* Certifications Tab */}
      <TabPanel value={currentTab} index={2}>
        <Typography variant="h6">Certifications</Typography>
        <Typography color="textSecondary">
          Certification tracking will be implemented here.
        </Typography>
      </TabPanel>

      {/* Compliance Tab */}
      <TabPanel value={currentTab} index={3}>
        <Typography variant="h6">Compliance Overview</Typography>
        <Typography color="textSecondary">
          Compliance dashboard will be implemented here.
        </Typography>
      </TabPanel>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEditPersona(selectedPersona!)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleManageConsent(selectedPersona!)}>
          <SecurityIcon sx={{ mr: 1 }} />
          Manage Consent
        </MenuItem>
        <MenuItem onClick={() => handleExportData(selectedPersona!)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export Data
        </MenuItem>
        <MenuItem onClick={() => handleDeletePersona(selectedPersona!)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Persona Form Dialog */}
      <PersonaForm
        open={isFormOpen}
        persona={selectedPersona}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPersona(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Consent Management Dialog */}
      <ConsentManagement
        open={isConsentOpen}
        persona={selectedPersona}
        onClose={() => {
          setIsConsentOpen(false);
          setSelectedPersona(null);
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button onClick={confirmDialog.action} color="error" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersonaManagement;
