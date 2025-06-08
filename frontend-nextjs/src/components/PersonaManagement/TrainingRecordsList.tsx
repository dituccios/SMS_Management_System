import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
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
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTrainingRecords } from '../../hooks/useTrainingRecords';
import { TrainingRecord, TrainingStatus, ComplianceStatus } from '../../types/training';
import { formatDate, formatProgress, formatTrainingStatus, formatComplianceStatus } from '../../utils/formatters';

interface TrainingRecordsListProps {
  personaId?: string;
  showPersonaColumn?: boolean;
}

const TrainingRecordsList: React.FC<TrainingRecordsListProps> = ({
  personaId,
  showPersonaColumn = true
}) => {
  const {
    trainingRecords,
    loading,
    error,
    createTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    getComplianceStats
  } = useTrainingRecords();

  const [filteredRecords, setFilteredRecords] = useState<TrainingRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainingStatus | 'ALL'>('ALL');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'ALL'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [complianceStats, setComplianceStats] = useState<any>(null);

  useEffect(() => {
    loadComplianceStats();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [trainingRecords, searchTerm, statusFilter, complianceFilter, expiryFilter, personaId]);

  const loadComplianceStats = async () => {
    try {
      const stats = await getComplianceStats();
      setComplianceStats(stats);
    } catch (error) {
      console.error('Failed to load compliance stats:', error);
    }
  };

  const filterRecords = () => {
    let filtered = trainingRecords;

    // Filter by persona if specified
    if (personaId) {
      filtered = filtered.filter(record => record.personaId === personaId);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.persona.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.persona.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.persona.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Compliance filter
    if (complianceFilter !== 'ALL') {
      filtered = filtered.filter(record => record.complianceStatus === complianceFilter);
    }

    // Expiry filter
    if (expiryFilter !== 'ALL') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(record => {
        if (!record.expiryDate) return expiryFilter === 'ALL';
        const expiryDate = new Date(record.expiryDate);

        switch (expiryFilter) {
          case 'EXPIRING_SOON':
            return expiryDate > now && expiryDate <= thirtyDaysFromNow;
          case 'EXPIRED':
            return expiryDate <= now;
          default:
            return true;
        }
      });
    }

    setFilteredRecords(filtered);
  };

  const handleCreateRecord = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEditRecord = (record: TrainingRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteRecord = async (record: TrainingRecord) => {
    if (window.confirm(`Are you sure you want to delete this training record?`)) {
      try {
        await deleteTrainingRecord(record.id);
        setAnchorEl(null);
      } catch (error) {
        console.error('Failed to delete training record:', error);
      }
    }
  };

  const handleMarkComplete = async (record: TrainingRecord) => {
    try {
      await updateTrainingRecord(record.id, {
        status: 'COMPLETED',
        completionDate: new Date(),
        progress: 100
      });
      setAnchorEl(null);
    } catch (error) {
      console.error('Failed to mark training as complete:', error);
    }
  };

  const getStatusIcon = (status: TrainingStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon color="success" />;
      case 'IN_PROGRESS':
        return <ScheduleIcon color="primary" />;
      case 'OVERDUE':
        return <WarningIcon color="error" />;
      case 'EXPIRED':
        return <WarningIcon color="warning" />;
      default:
        return <AssignmentIcon color="action" />;
    }
  };

  const getComplianceColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'COMPLIANT':
        return 'success';
      case 'NON_COMPLIANT':
        return 'error';
      case 'OVERDUE':
        return 'warning';
      case 'PENDING':
        return 'info';
      default:
        return 'default';
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry <= thirtyDaysFromNow;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Training Records
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadComplianceStats}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRecord}
          >
            Add Training Record
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Compliance Stats */}
      {complianceStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Box>
                    <Typography variant="h6">{complianceStats.compliant || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Compliant
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
                  <WarningIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{complianceStats.overdue || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Overdue
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
                  <ScheduleIcon color="info" />
                  <Box>
                    <Typography variant="h6">{complianceStats.pending || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pending
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
                  <AssignmentIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{filteredRecords.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Records
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as TrainingStatus | 'ALL')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="ENROLLED">Enrolled</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
            <MenuItem value="OVERDUE">Overdue</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Compliance</InputLabel>
          <Select
            value={complianceFilter}
            label="Compliance"
            onChange={(e) => setComplianceFilter(e.target.value as ComplianceStatus | 'ALL')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="COMPLIANT">Compliant</MenuItem>
            <MenuItem value="NON_COMPLIANT">Non-Compliant</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="OVERDUE">Overdue</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Expiry</InputLabel>
          <Select
            value={expiryFilter}
            label="Expiry"
            onChange={(e) => setExpiryFilter(e.target.value as 'ALL' | 'EXPIRING_SOON' | 'EXPIRED')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="EXPIRING_SOON">Expiring Soon</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Training Records Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {showPersonaColumn && <TableCell>Personnel</TableCell>}
              <TableCell>Training</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Compliance</TableCell>
              <TableCell>Enrollment Date</TableCell>
              <TableCell>Completion Date</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                {showPersonaColumn && (
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {record.persona.firstName} {record.persona.lastName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {record.persona.department}
                      </Typography>
                    </Box>
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(record.status)}
                    <Box>
                      <Typography variant="body2">{record.training.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {record.training.category}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatTrainingStatus(record.status)}
                    color={record.status === 'COMPLETED' ? 'success' : 
                           record.status === 'OVERDUE' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={record.progress}
                      sx={{ width: 60, height: 6 }}
                    />
                    <Typography variant="caption">
                      {formatProgress(record.progress)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatComplianceStatus(record.complianceStatus)}
                    color={getComplianceColor(record.complianceStatus) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(record.enrollmentDate)}</TableCell>
                <TableCell>
                  {record.completionDate ? formatDate(record.completionDate) : 'N/A'}
                </TableCell>
                <TableCell>
                  {record.expiryDate ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isExpired(record.expiryDate) && (
                        <Badge color="error" variant="dot">
                          <WarningIcon fontSize="small" color="error" />
                        </Badge>
                      )}
                      {isExpiringSoon(record.expiryDate) && !isExpired(record.expiryDate) && (
                        <Badge color="warning" variant="dot">
                          <WarningIcon fontSize="small" color="warning" />
                        </Badge>
                      )}
                      <Typography variant="body2">
                        {formatDate(record.expiryDate)}
                      </Typography>
                    </Box>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  {record.score !== null ? `${record.score}%` : 'N/A'}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      setSelectedRecord(record);
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEditRecord(selectedRecord!)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedRecord?.status !== 'COMPLETED' && (
          <MenuItem onClick={() => handleMarkComplete(selectedRecord!)}>
            <CheckCircleIcon sx={{ mr: 1 }} />
            Mark Complete
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteRecord(selectedRecord!)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TrainingRecordsList;
